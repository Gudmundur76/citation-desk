import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

/**
 * Warm-up heartbeat handler.
 * Called every 5 minutes by the Manus Heartbeat cron to prevent Cloud Run cold starts.
 * Also hits the upstream ttruthdesk.claims API to keep that connection warm.
 */
export async function warmupHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const start = Date.now();

    // Ping the upstream API to keep the connection warm
    let upstreamOk = false;
    try {
      const upstreamUrl = process.env.EXTERNAL_API_BASE_URL || "https://ttruthdesk.claims";
      const r = await fetch(`${upstreamUrl}/api/public/claims?limit=1`, {
        signal: AbortSignal.timeout(5000),
      });
      upstreamOk = r.ok;
    } catch {
      // Non-fatal — the warm-up itself succeeded even if upstream is slow
      upstreamOk = false;
    }

    const elapsed = Date.now() - start;

    return res.json({
      ok: true,
      elapsed_ms: elapsed,
      upstream_ok: upstreamOk,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}
