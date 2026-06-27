/**
 * compareRouter — Perplexity vs citation.is accuracy comparison tool.
 *
 * runComparison:
 *   1. Calls Perplexity Sonar to get an AI answer for the user's query
 *   2. Extracts factual claims from the answer via LLM
 *   3. Verifies each claim via the citation.is verdict engine (ttruthdesk proxy)
 *   4. Stores the result and returns a shareId
 *
 * getComparison:
 *   Returns a stored comparison result by shareId.
 */
import { z } from "zod";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { comparisons } from "../drizzle/schema";

const EXTERNAL_API_BASE = process.env.EXTERNAL_API_BASE_URL || "https://citation.manus.space";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

// ─── Perplexity Sonar call ────────────────────────────────────────────────────
async function callPerplexitySonar(query: string): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    // Fallback: use the built-in LLM to simulate an AI answer
    const resp = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a knowledgeable AI assistant. Answer the user's question with specific factual claims. Be concise but include concrete numbers, study findings, and named compounds where relevant. Do not hedge excessively.",
        },
        { role: "user", content: query },
      ],
    });
    return (resp.choices?.[0]?.message?.content as string) ?? "";
  }

  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: query }],
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!resp.ok) {
    throw new Error(`Perplexity API error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Claim extractor ──────────────────────────────────────────────────────────
interface ExtractedClaim {
  claim: string;
}

async function extractClaims(aiAnswer: string): Promise<ExtractedClaim[]> {
  const resp = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are a scientific fact-checker. Extract every distinct, verifiable factual claim from the text. Each claim must be a single sentence that can be independently verified. Return JSON only.",
      },
      {
        role: "user",
        content: `Extract all verifiable factual claims from this AI answer. Return a JSON array of objects with a "claim" string field. Limit to 8 most important claims.\n\nAI Answer:\n${aiAnswer}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "claims_list",
        strict: true,
        schema: {
          type: "object",
          properties: {
            claims: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  claim: { type: "string" },
                },
                required: ["claim"],
                additionalProperties: false,
              },
            },
          },
          required: ["claims"],
          additionalProperties: false,
        },
      },
    },
  });

  try {
    const raw = resp.choices?.[0]?.message?.content as string;
    const parsed = JSON.parse(raw) as { claims: ExtractedClaim[] };
    return parsed.claims?.slice(0, 8) ?? [];
  } catch {
    return [];
  }
}

// ─── Claim verifier (via ttruthdesk proxy) ────────────────────────────────────
interface VerifyResult {
  verdict: string;
  confidence: number;
  summary: string;
}

async function verifyClaim(claim: string): Promise<VerifyResult> {
  try {
    const resp = await fetch(`${EXTERNAL_API_BASE}/api/public/verify-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!resp.ok) throw new Error(`verify-claim ${resp.status}`);

    const data = (await resp.json()) as {
      verdict?: string;
      confidence?: number;
      rationale?: string;
    };

    return {
      verdict: data.verdict ?? "ambiguous",
      confidence: Math.round((data.confidence ?? 0.5) * 100),
      summary: data.rationale ?? "",
    };
  } catch {
    // Fallback: use LLM to verify
    try {
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              'You are a scientific fact-checker. Evaluate whether the given claim is supported by scientific evidence. Return JSON with fields: verdict (one of: supported, refuted, ambiguous, insufficient_evidence), confidence (0-1), summary (1-2 sentences explaining the evidence).',
          },
          { role: "user", content: `Evaluate this claim: "${claim}"` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "verdict",
            strict: true,
            schema: {
              type: "object",
              properties: {
                verdict: {
                  type: "string",
                  enum: ["supported", "refuted", "ambiguous", "insufficient_evidence"],
                },
                confidence: { type: "number" },
                summary: { type: "string" },
              },
              required: ["verdict", "confidence", "summary"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = resp.choices?.[0]?.message?.content as string;
      const parsed = JSON.parse(raw) as VerifyResult & { confidence: number };
      return {
        verdict: parsed.verdict ?? "ambiguous",
        confidence: Math.round((parsed.confidence ?? 0.5) * 100),
        summary: parsed.summary ?? "",
      };
    } catch {
      return { verdict: "error", confidence: 0, summary: "" };
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const compareRouter = router({
  /**
   * Run a full comparison: query → Perplexity answer → extract claims → verify each.
   * Returns the stored result with a shareId.
   */
  runComparison: publicProcedure
    .input(z.object({ query: z.string().min(10).max(500) }))
    .mutation(async ({ input }) => {
      // 1. Get AI answer
      const aiAnswer = await callPerplexitySonar(input.query);
      if (!aiAnswer) {
        throw new Error("Failed to get AI answer. Please try again.");
      }

      // 2. Extract claims
      const extracted = await extractClaims(aiAnswer);

      // 3. Verify each claim (in parallel, max 8)
      const verifiedClaims = await Promise.all(
        extracted.map(async (e) => {
          const v = await verifyClaim(e.claim);
          return { claim: e.claim, ...v };
        })
      );

      // 4. Persist
      const shareId = randomBytes(8).toString("hex");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(comparisons).values({
        shareId,
        query: input.query,
        aiAnswer,
        aiSource: PERPLEXITY_API_KEY ? "perplexity-sonar" : "built-in-llm",
        claimsJson: JSON.stringify(verifiedClaims),
        createdAt: new Date(),
      });

      return {
        shareId,
        query: input.query,
        aiAnswer,
        aiSource: PERPLEXITY_API_KEY ? "perplexity-sonar" : "built-in-llm",
        claimsJson: JSON.stringify(verifiedClaims),
      };
    }),

  /**
   * Retrieve a stored comparison result by shareId.
   */
  getComparison: publicProcedure
    .input(z.object({ shareId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select()
        .from(comparisons)
        .where(eq(comparisons.shareId, input.shareId))
        .limit(1);

      if (!row) return null;
      return row;
    }),
});
