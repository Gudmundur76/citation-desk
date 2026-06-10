/**
 * Proxy for the ttruthdesk.claims external API.
 *
 * Mounts two proxy paths:
 *   /api/external/trpc/*   → https://ttruthdesk.claims/api/trpc/*  (tRPC procedures)
 *   /api/external/public/* → https://ttruthdesk.claims/api/public/* (REST endpoints)
 *
 * Both paths forward requests server-side, keeping the external origin
 * out of the browser and avoiding any CORS / sandbox network issues.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_TRPC = 'https://ttruthdesk.claims/api/trpc'
const UPSTREAM_PUBLIC = 'https://ttruthdesk.claims/api/public'

export function registerExternalProxy(app: Express): void {
  // ─── tRPC proxy ────────────────────────────────────────────────────────────

  // Handle GET (queries with ?input=...)
  app.get('/api/external/trpc/:procedure', async (req: Request, res: Response) => {
    const { procedure } = req.params
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const url = `${UPSTREAM_TRPC}/${procedure}${qs}`
    try {
      const upstream = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })
      const body = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] GET error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  // Handle POST (mutations)
  app.post('/api/external/trpc/:procedure', async (req: Request, res: Response) => {
    const { procedure } = req.params
    const url = `${UPSTREAM_TRPC}/${procedure}`
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      const body = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] POST error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  // ─── Public REST proxy ──────────────────────────────────────────────────────

  // Forward GET /api/external/public/* → https://ttruthdesk.claims/api/public/*
  // Handles both the paginated list (/claims) and detail (/claims/:id).
  app.get('/api/external/public/*', async (req: Request, res: Response) => {
    const suffix = req.params[0] as string
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const url = `${UPSTREAM_PUBLIC}/${suffix}${qs}`
    try {
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      const body = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] Public GET error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  console.log('[ExternalProxy] Proxy mounted at /api/external/trpc/* and /api/external/public/* → ttruthdesk.claims')
}
