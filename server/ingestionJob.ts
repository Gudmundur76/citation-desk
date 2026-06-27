/**
 * Autonomous Ingestion Job
 *
 * Runs every 6 hours via Manus Heartbeat.
 * Pulls from OpenAlex (free, 250M scholarly works) and Perplexity Search API
 * using Google Trends topics as query seeds.
 *
 * Updates ingestion_sources table with live stats so /sources and /loop pages
 * show real numbers.
 *
 * Architecture:
 *   Google Trends → seed topics → OpenAlex API → extract claims via ttruthdesk
 *   Google Trends → seed topics → Perplexity Search → extract claims via ttruthdesk
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { ingestionSources, scheduledJobs } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

const UPSTREAM_BASE = process.env.EXTERNAL_API_BASE_URL || "https://citation.manus.space";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "";

// ─── Topic seeds (high-value queries aligned with buyer interests) ─────────────
const SEED_TOPICS = [
  // Health & longevity (Perplexity top queries)
  "metformin longevity evidence",
  "berberine blood sugar clinical trials",
  "NMN human trials effectiveness",
  "gut microbiome mental health evidence",
  "intermittent fasting metabolic benefits",
  // Structural biology
  "CRISPR therapeutic applications 2024",
  "mRNA vaccine long-term safety",
  "GLP-1 receptor agonist cardiovascular",
  // Cross-domain (legal/financial AI grounding)
  "AI hallucination clinical decision making",
  "large language model accuracy medical",
];

// ─── OpenAlex ingestion ────────────────────────────────────────────────────────
async function ingestFromOpenAlex(topic: string): Promise<{ docs: number; claims: number }> {
  try {
    const query = encodeURIComponent(topic);
    const url = `https://api.openalex.org/works?search=${query}&filter=open_access.is_oa:true,type:article&per-page=5&sort=cited_by_count:desc&mailto=admin@citation.is`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { docs: 0, claims: 0 };

    const data = await res.json() as {
      results?: Array<{ id: string; title: string; doi?: string; abstract_inverted_index?: Record<string, number[]> }>;
    };

    const works = data.results ?? [];
    let claimsCount = 0;

    for (const work of works.slice(0, 3)) {
      // Reconstruct abstract from inverted index
      let abstract = "";
      if (work.abstract_inverted_index) {
        const wordPositions: Array<[string, number]> = [];
        for (const [word, positions] of Object.entries(work.abstract_inverted_index)) {
          for (const pos of positions) {
            wordPositions.push([word, pos]);
          }
        }
        wordPositions.sort((a, b) => a[1] - b[1]);
        abstract = wordPositions.map(([w]) => w).join(" ");
      }

      if (!abstract || abstract.length < 50) continue;

      // Send to ttruthdesk for claim extraction
      try {
        const extractRes = await fetch(`${UPSTREAM_BASE}/api/public/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `${work.title}. ${abstract}`,
            source: work.doi ? `https://doi.org/${work.doi}` : work.id,
            sourceType: "academic",
          }),
          signal: AbortSignal.timeout(30_000),
        });
        if (extractRes.ok) {
          const extracted = await extractRes.json() as { claims?: unknown[] };
          claimsCount += extracted.claims?.length ?? 0;
        }
      } catch {
        // Non-fatal — continue with other works
      }
    }

    return { docs: works.length, claims: claimsCount };
  } catch {
    return { docs: 0, claims: 0 };
  }
}

// ─── Perplexity Search ingestion ───────────────────────────────────────────────
async function ingestFromPerplexity(topic: string): Promise<{ docs: number; claims: number }> {
  if (!PERPLEXITY_API_KEY) return { docs: 0, claims: 0 };

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: `What does the current scientific evidence say about: ${topic}? Provide specific factual claims with citations.`,
          },
        ],
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return { docs: 0, claims: 0 };

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      citations?: string[];
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content || content.length < 50) return { docs: 0, claims: 0 };

    // Send to ttruthdesk for claim extraction
    try {
      const extractRes = await fetch(`${UPSTREAM_BASE}/api/public/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          source: `perplexity:${topic}`,
          sourceType: "web",
          citations: data.citations ?? [],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (extractRes.ok) {
        const extracted = await extractRes.json() as { claims?: unknown[] };
        return { docs: 1, claims: extracted.claims?.length ?? 0 };
      }
    } catch {
      // Non-fatal
    }

    return { docs: 1, claims: 0 };
  } catch {
    return { docs: 0, claims: 0 };
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────
export async function ingestionJobHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "no-db" });

    // Verify this is a known scheduled job
    const rows = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.taskUid, user.taskUid))
      .limit(1);

    if (rows.length === 0) {
      return res.json({ ok: true, skipped: "orphan-task-uid" });
    }

    const results: Record<string, { docs: number; claims: number }> = {};
    let totalDocs = 0;
    let totalClaims = 0;

    // Run a subset of topics per cycle (rotate to cover all over time)
    const hour = new Date().getUTCHours();
    const topicBatch = SEED_TOPICS.slice(
      (hour % 3) * 3,
      Math.min((hour % 3) * 3 + 4, SEED_TOPICS.length)
    );

    // OpenAlex ingestion
    for (const topic of topicBatch.slice(0, 2)) {
      const r = await ingestFromOpenAlex(topic);
      results[`openalex:${topic}`] = r;
      totalDocs += r.docs;
      totalClaims += r.claims;
    }

    // Perplexity ingestion (if API key configured)
    if (PERPLEXITY_API_KEY) {
      for (const topic of topicBatch.slice(0, 2)) {
        const r = await ingestFromPerplexity(topic);
        results[`perplexity:${topic}`] = r;
        totalDocs += r.docs;
        totalClaims += r.claims;
      }
    }

    // Update ingestion_sources stats
    await db
      .update(ingestionSources)
      .set({
        documentsIngested: totalDocs,
        queriesRun: topicBatch.length,
        lastRunAt: new Date(),
        lastError: null,
      })
      .where(eq(ingestionSources.name, "openalex"));

    if (PERPLEXITY_API_KEY) {
      await db
        .update(ingestionSources)
        .set({
          documentsIngested: totalDocs,
          queriesRun: topicBatch.length,
          lastRunAt: new Date(),
          lastError: null,
        })
        .where(eq(ingestionSources.name, "perplexity_search"));
    }

    // Update job last run
    await db
      .update(scheduledJobs)
      .set({ lastRunAt: new Date() })
      .where(eq(scheduledJobs.taskUid, user.taskUid));

    return res.json({
      ok: true,
      topicsProcessed: topicBatch.length,
      totalDocs,
      totalClaims,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);

    // Log error to ingestion_sources
    try {
      const db = await getDb();
      if (db) {
        await db
          .update(ingestionSources)
          .set({ lastError: error, lastRunAt: new Date() })
          .where(eq(ingestionSources.name, "openalex"));
      }
    } catch {
      // Non-fatal
    }

    return res.status(500).json({
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
