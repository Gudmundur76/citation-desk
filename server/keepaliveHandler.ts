/**
 * keepaliveHandler.ts
 *
 * Heartbeat cron handler — fires every 5 minutes via the Manus platform scheduler.
 * Pings the three analytics tRPC procedures (stats, verticals, contradictions) to
 * keep the upstream connection warm and pre-populate the in-memory proxy cache.
 *
 * POST /api/scheduled/keepalive
 * Auth: sdk.authenticateRequest → user.isCron === true
 */

import type { Request, Response } from 'express'
import { sdk } from './_core/sdk'

const UPSTREAM_TRPC = 'https://citation.manus.space/api/trpc'
const TIMEOUT_MS = 20_000

type PingResult = { endpoint: string; ok: boolean; ms: number; error?: string }

async function pingTrpc(procedure: string, input: unknown): Promise<PingResult> {
  const start = Date.now()
  const url = `${UPSTREAM_TRPC}/${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const ms = Date.now() - start
    if (!res.ok) {
      return { endpoint: procedure, ok: false, ms, error: `HTTP ${res.status}` }
    }
    // Drain the body to ensure the connection is fully utilised
    await res.text()
    return { endpoint: procedure, ok: true, ms }
  } catch (err) {
    return { endpoint: procedure, ok: false, ms: Date.now() - start, error: String(err) }
  }
}

export async function keepaliveHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req)
    if (!user.isCron) {
      res.status(403).json({ error: 'cron-only' })
      return
    }

    const startAll = Date.now()

    // Ping all three analytics procedures in parallel
    const results = await Promise.all([
      pingTrpc('verticals.globalStats', {}),
      pingTrpc('verticals.stats', {}),
      pingTrpc('graph.contradictions', {}),
      pingTrpc('leaderboard.topEntities', { limit: 20 }),
    ])

    const totalMs = Date.now() - startAll
    const allOk = results.every((r) => r.ok)

    console.log(
      `[Keepalive] Cron fired — ${results.filter((r) => r.ok).length}/${results.length} endpoints warm in ${totalMs}ms`,
    )

    res.json({
      ok: allOk,
      timestamp: new Date().toISOString(),
      totalMs,
      results,
    })
  } catch (err) {
    console.error('[Keepalive] Handler error:', err)
    res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url, taskUid: 'unknown' },
      timestamp: new Date().toISOString(),
    })
  }
}
