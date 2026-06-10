/**
 * Heartbeat handler: /api/scheduled/claimDigest
 *
 * Runs every hour. Fetches the latest claims from the ttruthdesk.claims API,
 * finds all registered users, and dispatches a "New verified claims" notification
 * to each user who has push subscriptions enabled.
 *
 * Registered as a project-level Heartbeat cron (§4a of periodic-updates.md).
 * The cron task UID is persisted in the `scheduledJobs` table so it can be
 * updated or paused without losing the reference.
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, scheduledJobs } from "../drizzle/schema";
import { dispatchNotification } from "./dispatchNotification";
import { getPushSubscriptionsForUser } from "./notificationsDb";
import { sdk } from "./_core/sdk";

// ─── Callback handler ─────────────────────────────────────────────────────────

export async function claimDigestHandler(req: Request, res: Response) {
  try {
    // 1. Authenticate — must be a cron trigger
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    // 2. Verify the taskUid matches a known scheduled job (idempotency guard)
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "db-unavailable" });
    }

    const [job] = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.taskUid, user.taskUid))
      .limit(1);

    if (!job) {
      // Unknown task UID — return 200 so the platform stops retrying
      return res.json({ ok: true, skipped: "orphan-task-uid" });
    }

    // 3. Fetch recent claims from the external API via the internal proxy
    let recentCount = 0;
    let topClaim = "";
    try {
      const baseUrl = process.env.NODE_ENV === "production"
        ? `https://${req.headers.host}`
        : "http://localhost:3000";
      const url = `${baseUrl}/api/external/trpc/verticals.globalStats`;
      const statsRes = await fetch(url);
      if (statsRes.ok) {
        const data = await statsRes.json();
        recentCount = data?.result?.data?.json?.totalClaims ?? 0;
      }

      // Also fetch one recent claim for the notification body
      const searchUrl = `${baseUrl}/api/external/trpc/search.claims?input=${encodeURIComponent(JSON.stringify({ json: { query: "verified", limit: 1 } }))}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const claims = searchData?.result?.data?.json?.results ?? [];
        topClaim = claims[0]?.claimText?.slice(0, 120) ?? "";
      }
    } catch (fetchErr) {
      console.warn("[ClaimDigest] Could not fetch claim data:", fetchErr);
    }

    // 4. Notify all users who have push subscriptions
    const allUsers = await db.select({ id: users.id }).from(users);
    let notified = 0;

    for (const u of allUsers) {
      const subs = await getPushSubscriptionsForUser(u.id);
      if (subs.length === 0) continue; // skip users without push enabled

      await dispatchNotification(u.id, {
        type: "claim",
        title: `${recentCount.toLocaleString()} verified claims in the knowledge base`,
        body: topClaim
          ? `Latest: "${topClaim}"`
          : "Visit citation.is to explore the latest verified scientific claims.",
        link: "/search",
      });
      notified++;
    }

    // 5. Update lastRunAt on the job record
    await db
      .update(scheduledJobs)
      .set({ lastRunAt: new Date() })
      .where(eq(scheduledJobs.taskUid, user.taskUid));

    return res.json({ ok: true, notified, totalClaims: recentCount });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[ClaimDigest] Handler error:", err);
    return res.status(500).json({
      error,
      stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
