/**
 * Heartbeat handler: /api/scheduled/claimDigest
 *
 * Triggered hourly by the Manus platform cron. Fetches the latest global
 * stats from the citation.manus.space backend and dispatches a push notification
 * to all users who have enabled browser push.
 *
 * Auth: sdk.authenticateRequest -> user.isCron === true, user.taskUid set.
 * Idempotent: safe to retry on 5xx (platform retries up to 3x).
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { scheduledJobs, pushSubscriptions } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";

async function sendPushToAll(title: string, body: string, url: string) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const webpush = await import("web-push");
  webpush.setVapidDetails("mailto:admin@citation.is", ENV.vapidPublicKey, ENV.vapidPrivateKey);

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  let failed = 0;
  const expiredIds: number[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) expiredIds.push(sub.id);
        failed++;
      }
    }),
  );

  if (expiredIds.length > 0) {
    await Promise.allSettled(
      expiredIds.map((id) => db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))),
    );
  }

  return { sent, failed, expiredCleaned: expiredIds.length };
}

async function fetchGlobalStats(): Promise<{ totalClaims?: number; supportedVerdicts?: number } | null> {
  try {
    const port = process.env.PORT ?? 3000;
    const res = await fetch(
      `http://localhost:${port}/api/external/trpc/verticals.globalStats`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { result?: { data?: { json?: { totalClaims?: number; supportedVerdicts?: number } } } };
    return data?.result?.data?.json ?? null;
  } catch {
    return null;
  }
}

export async function claimDigestHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "no-db" });

    const rows = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.taskUid, user.taskUid))
      .limit(1);

    if (rows.length === 0) {
      return res.json({ ok: true, skipped: "orphan-task-uid" });
    }

    const job = rows[0];
    const stats = await fetchGlobalStats();
    const claimCount = stats?.totalClaims ?? 0;
    const supportedCount = stats?.supportedVerdicts ?? 0;

    const pushResult = await sendPushToAll(
      "Citation Desk - Hourly Digest",
      `Knowledge base now has ${claimCount.toLocaleString()} claims (${supportedCount.toLocaleString()} supported). Check the latest on citation.is.`,
      "https://citation.is",
    );

    await db
      .update(scheduledJobs)
      .set({ lastRunAt: new Date() })
      .where(eq(scheduledJobs.id, job.id));

    return res.json({
      ok: true,
      jobName: job.name,
      stats: { totalClaims: claimCount, supportedVerdicts: supportedCount },
      push: pushResult,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return res.status(500).json({
      error,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
