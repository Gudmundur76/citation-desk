import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

const UPSTREAM = process.env.TTRUTHDESK_BASE_URL ?? "https://citation.manus.space";

/**
 * Warm-up heartbeat handler.
 * Called every 5 minutes by the Manus Heartbeat cron to prevent Cloud Run cold starts
 * AND to keep the upstream Cloudflare Worker warm so it never cold-starts on a real request.
 *
 * Pings three upstream endpoints in parallel:
 *   1. /.well-known/mcp.json  — MCP discovery card (slow on cold start, ~11 KB)
 *   2. POST /mcp (initialize) — MCP JSON-RPC transport
 *   3. /api/public/claims     — REST API
 */
export async function warmupHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const start = Date.now();
    const results: Record<string, boolean> = {};

    // Run all three pings in parallel — total wall time = slowest ping, not sum
    await Promise.allSettled([
      // 1. MCP discovery card
      fetch(`${UPSTREAM}/.well-known/mcp.json`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      }).then(r => { results.mcp_card = r.ok }).catch(() => { results.mcp_card = false }),

      // 2. MCP JSON-RPC initialize — wakes the SSE handler
      fetch(`${UPSTREAM}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "initialize",
          params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "citation.is-warmup", version: "1.0" } },
        }),
        signal: AbortSignal.timeout(10_000),
      }).then(r => { results.mcp_rpc = r.ok }).catch(() => { results.mcp_rpc = false }),

      // 3. REST claims endpoint
      fetch(`${UPSTREAM}/api/public/claims?limit=1`, {
        signal: AbortSignal.timeout(8_000),
      }).then(r => { results.rest_api = r.ok }).catch(() => { results.rest_api = false }),
    ]);

    const elapsed = Date.now() - start;
    return res.json({
      ok: true,
      elapsed_ms: elapsed,
      upstream: results,
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
