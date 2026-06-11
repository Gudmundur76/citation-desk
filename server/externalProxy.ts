/**
 * Proxy for the ttruthdesk.claims external API.
 *
 * Mounts the following proxy paths:
 *   /api/external/trpc/*        → https://ttruthdesk.claims/api/trpc/*
 *   /api/external/public/*      → https://ttruthdesk.claims/api/public/*
 *   /api/public/verify-claim    → https://ttruthdesk.claims/api/public/verify-claim (POST)
 *   /api/public/claims.json     → https://ttruthdesk.claims/api/public/claims.json
 *   /api/public/graph.json      → https://ttruthdesk.claims/api/public/graph.json
 *   /api/md                     → https://ttruthdesk.claims/api/md
 *   /openapi.json               → https://ttruthdesk.claims/openapi.json
 *   /.well-known/mcp.json       → https://ttruthdesk.claims/.well-known/mcp.json
 *   /mcp                        → https://ttruthdesk.claims/mcp
 *
 * All paths forward requests server-side, keeping the external origin
 * out of the browser and avoiding any CORS / sandbox network issues.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = process.env.TTRUTHDESK_BASE_URL ?? 'https://ttruthdesk.claims'
const UPSTREAM_TRPC = `${UPSTREAM_BASE}/api/trpc`
const UPSTREAM_PUBLIC = `${UPSTREAM_BASE}/api/public`

/** Forward a GET request to the upstream URL, streaming the response back. */
async function proxyGet(upstreamUrl: string, req: Request, res: Response) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const url = `${upstreamUrl}${qs}`
  try {
    const upstream = await fetch(url, {
      headers: { Accept: req.headers.accept ?? 'application/json' },
    })
    const body = await upstream.text()
    res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
      .send(body)
  } catch (err) {
    console.error('[ExternalProxy] GET error:', url, err)
    res.status(502).json({ error: 'upstream_error', message: String(err) })
  }
}

/** Forward a POST request to the upstream URL, streaming the response back. */
async function proxyPost(upstreamUrl: string, req: Request, res: Response) {
  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body),
    })
    const body = await upstream.text()
    res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
      .send(body)
  } catch (err) {
    console.error('[ExternalProxy] POST error:', upstreamUrl, err)
    res.status(502).json({ error: 'upstream_error', message: String(err) })
  }
}

export function registerExternalProxy(app: Express): void {
  // ─── tRPC proxy ────────────────────────────────────────────────────────────

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
      console.error('[ExternalProxy] GET tRPC error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

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
      console.error('[ExternalProxy] POST tRPC error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  // ─── Public REST proxy (internal /api/external/public/* path) ──────────────

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

  // ─── Machine-readable / developer-facing public endpoints ──────────────────

  // POST /api/public/verify-claim — one-shot claim verification
  app.post('/api/public/verify-claim', async (req: Request, res: Response) => {
    await proxyPost(`${UPSTREAM_PUBLIC}/verify-claim`, req, res)
  })

  // GET /api/public/claims.json — machine-readable registry
  app.get('/api/public/claims.json', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_PUBLIC}/claims.json`, req, res)
  })

  // GET /api/public/graph.json — knowledge graph data
  app.get('/api/public/graph.json', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_PUBLIC}/graph.json`, req, res)
  })

  // GET /api/md — markdown summary for LLM grounding
  app.get('/api/md', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_BASE}/api/md`, req, res)
  })

  // GET /openapi.json — OpenAPI spec
  app.get('/openapi.json', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_BASE}/openapi.json`, req, res)
  })

  // GET /.well-known/mcp.json — MCP tool card
  app.get('/.well-known/mcp.json', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_BASE}/.well-known/mcp.json`, req, res)
  })

  // GET /mcp — MCP endpoint
  app.get('/mcp', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_BASE}/mcp`, req, res)
  })

  console.log('[ExternalProxy] Proxy mounted: /api/external/trpc/*, /api/external/public/*, /api/public/verify-claim, /api/public/claims.json, /api/public/graph.json, /api/md, /openapi.json, /.well-known/mcp.json, /mcp → ttruthdesk.claims')
}
