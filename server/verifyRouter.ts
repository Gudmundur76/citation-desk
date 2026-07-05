/**
 * Verify Router — /verify comparison tool
 *
 * Accepts any claim text, runs it through the ttruthdesk verdict engine,
 * stores the result with a shareable ID, and returns the verdict.
 *
 * Rate limiting: 5 free verifications per IP per hour.
 * Paid subscribers: unlimited via API key.
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { verificationResults, ingestionSources } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

const UPSTREAM_BASE = process.env.EXTERNAL_API_BASE_URL || "https://ttruthdesk.claims";

function generateShareId(): string {
  return crypto.randomBytes(12).toString("base64url");
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "citation-salt").digest("hex").slice(0, 32);
}

export const verifyRouter = router({
  // Verify a single claim
  verifyClaim: publicProcedure
    .input(
      z.object({
        claimText: z.string().min(10).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const ip = (ctx as { req?: { ip?: string; headers?: Record<string, string | string[]> } }).req?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ?? "unknown";
      const ipHash = hashIp(ip);

      // Rate limit: check recent verifications from this IP (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCount = await db
        .select()
        .from(verificationResults)
        .where(eq(verificationResults.ipHash, ipHash))
        .limit(6);

      const recentInHour = recentCount.filter(r => r.createdAt > oneHourAgo);
      if (recentInHour.length >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Free tier allows 5 verifications per hour. Upgrade for unlimited access.",
        });
      }

      // Call ttruthdesk verdict engine
      let verdict: "supported" | "refuted" | "ambiguous" | "insufficient_evidence" | "error" = "error";
      let confidenceScore = 0;
      let evidenceSummary = "";
      let sourceUrls: string[] = [];
      let rawResponse = "";

      try {
        const res = await fetch(`${UPSTREAM_BASE}/api/public/verify-claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim: input.claimText }),
          signal: AbortSignal.timeout(25_000),
        });

        if (res.ok) {
          const data = await res.json() as {
            ok?: boolean;
            verdict?: string;
            confidence?: number;
            rationale?: string;
            evidenceUrl?: string | null;
            pubmedResults?: Array<{ pmid: string; title: string }>;
          };
          rawResponse = JSON.stringify(data);

          const v = (data.verdict ?? "").toLowerCase();
          if (v === "supported" || v === "partially supported") verdict = "supported";
          else if (v === "refuted" || v === "contradicted") verdict = "refuted";
          else if (v === "ambiguous") verdict = "ambiguous";
          else if (v === "insufficient evidence" || v === "insufficient_evidence") verdict = "insufficient_evidence";
          else verdict = "ambiguous";

          // ttruthdesk returns confidence as 0-1 or sometimes omits it; derive from verdict
          confidenceScore = data.confidence != null
            ? Math.round(data.confidence * 100)
            : verdict === "supported" ? 75 : verdict === "refuted" ? 80 : 50;
          evidenceSummary = data.rationale ?? "";
          // Build source URLs from pubmed results
          sourceUrls = (data.pubmedResults ?? []).slice(0, 5).map(
            (r) => `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`
          );
          if (data.evidenceUrl) sourceUrls.unshift(data.evidenceUrl);
        } else {
          // Fallback: use LLM to provide a preliminary verdict
          const { invokeLLM } = await import("./_core/llm");
          const llmRes = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a scientific claim verification assistant. Evaluate the following claim based on your knowledge of peer-reviewed research. Return JSON with: verdict (supported|refuted|ambiguous|insufficient_evidence), confidence (0.0-1.0), summary (2-3 sentences explaining the verdict with specific evidence), sources (array of relevant paper titles or databases).`,
              },
              {
                role: "user",
                content: `Verify this claim: "${input.claimText}"`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "claim_verdict",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    verdict: { type: "string", enum: ["supported", "refuted", "ambiguous", "insufficient_evidence"] },
                    confidence: { type: "number" },
                    summary: { type: "string" },
                    sources: { type: "array", items: { type: "string" } },
                  },
                  required: ["verdict", "confidence", "summary", "sources"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = String(llmRes.choices?.[0]?.message?.content ?? "{}");
          rawResponse = content;
          const parsed = JSON.parse(content) as {
            verdict?: string;
            confidence?: number;
            summary?: string;
            sources?: string[];
          };

          const v2 = (parsed.verdict ?? "").toLowerCase();
          if (v2 === "supported") verdict = "supported";
          else if (v2 === "refuted") verdict = "refuted";
          else if (v2 === "ambiguous") verdict = "ambiguous";
          else verdict = "insufficient_evidence";

          confidenceScore = Math.round((parsed.confidence ?? 0.5) * 100);
          evidenceSummary = parsed.summary ?? "";
          sourceUrls = parsed.sources ?? [];
        }
      } catch (err) {
        verdict = "error";
        evidenceSummary = "Verification service temporarily unavailable. Please try again.";
      }

      // Store result
      const shareId = generateShareId();
      await db.insert(verificationResults).values({
        shareId,
        claimText: input.claimText,
        verdict,
        confidenceScore,
        evidenceSummary,
        sourceUrls: JSON.stringify(sourceUrls),
        rawResponse: rawResponse.slice(0, 4000),
        ipHash,
      });

      return {
        shareId,
        claimText: input.claimText,
        verdict,
        confidenceScore,
        evidenceSummary,
        sourceUrls,
        shareUrl: `/verify/${shareId}`,
      };
    }),

  // Get a shared verification result by shareId
  getVerification: publicProcedure
    .input(z.object({ shareId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(verificationResults)
        .where(eq(verificationResults.shareId, input.shareId))
        .limit(1);

      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });

      const r = rows[0];
      return {
        shareId: r.shareId,
        claimText: r.claimText,
        verdict: r.verdict,
        confidenceScore: r.confidenceScore,
        evidenceSummary: r.evidenceSummary ?? "",
        sourceUrls: JSON.parse(r.sourceUrls ?? "[]") as string[],
        createdAt: r.createdAt,
        shareUrl: `/verify/${r.shareId}`,
      };
    }),

  // Get ingestion sources stats for /sources and /loop pages
  getSources: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const sources = await db.select().from(ingestionSources);
    return sources.map(s => ({
      name: s.name,
      label: s.label,
      sourceType: s.sourceType,
      isActive: s.isActive,
      documentsIngested: s.documentsIngested,
      claimsExtracted: s.claimsExtracted,
      queriesRun: s.queriesRun,
      lastRunAt: s.lastRunAt,
      lastError: s.lastError,
    }));
  }),

  // Get recent verifications for the public feed
  getRecentVerifications: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          shareId: verificationResults.shareId,
          claimText: verificationResults.claimText,
          verdict: verificationResults.verdict,
          confidenceScore: verificationResults.confidenceScore,
          createdAt: verificationResults.createdAt,
        })
        .from(verificationResults)
        .orderBy(verificationResults.createdAt)
        .limit(input.limit);

      return rows;
    }),
});
