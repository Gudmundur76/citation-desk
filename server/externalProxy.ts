/**
 * Proxy for the upstream verification API.
 *
 * citation.is is the canonical public brand. The upstream hostname is an
 * internal implementation detail and must never appear in any response
 * delivered to clients.
 *
 * All proxied responses are passed through rewriteBrand() which replaces
 * every occurrence of the upstream hostname with https://citation.is and
 * normalises the verdict vocabulary to the canonical citation.is enum:
 *   Supported | Refuted | Ambiguous | Insufficient Evidence
 *
 * Mounted paths:
 *   /api/external/trpc/*        → upstream /api/trpc/*
 *   /api/external/public/*      → upstream /api/public/*
 *   /api/public/claims          → 301 redirect to /api/external/public/claims (documented alias)
 *   /api/public/verify-claim    → upstream /api/public/verify-claim (POST)
 *   /api/public/claims.json     → upstream /api/public/claims.json
 *   /api/public/graph.json      → upstream /api/public/graph.json
 *   /api/md                     → upstream /api/md
 *   /openapi.json               → static citation.is-branded file
 *   /.well-known/mcp.json       → upstream /.well-known/mcp.json (rewritten)
 *   /mcp                        → upstream /mcp (GET + POST, rewritten)
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = process.env.TTRUTHDESK_BASE_URL ?? 'https://ttruthdesk.claims'

// ─── In-memory response cache ─────────────────────────────────────────────────
// Caches slow upstream responses so cold-start + slow upstream don't stack.
// TTL: 5 minutes for MCP card (changes rarely), 2 minutes for others.

interface CacheEntry { body: string; contentType: string; ts: number }
const responseCache = new Map<string, CacheEntry>()

function cacheGet(key: string, ttlMs: number): CacheEntry | null {
  const entry = responseCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > ttlMs) { responseCache.delete(key); return null }
  return entry
}

function cacheSet(key: string, body: string, contentType: string): void {
  responseCache.set(key, { body, contentType, ts: Date.now() })
}

const UPSTREAM_TRPC = `${UPSTREAM_BASE}/api/trpc`
const UPSTREAM_PUBLIC = `${UPSTREAM_BASE}/api/public`
const UPSTREAM_V2 = `${UPSTREAM_BASE}/api/v2`
const CANONICAL_BASE = 'https://citation.is'

// ─── Brand rewrite ────────────────────────────────────────────────────────────

/**
 * Replace all upstream hostname references with the canonical citation.is
 * brand, and normalise the verdict vocabulary.
 *
 * Verdict mapping (upstream → canonical):
 *   supported        → Supported
 *   refuted          → Refuted
 *   inconclusive     → Ambiguous
 *   Contradicted     → Refuted
 *   Partially Supported → Ambiguous
 *   Out of Scope     → Insufficient Evidence
 *   Needs Expert Review → Insufficient Evidence
 *
 * Also rewrites:
 *   "Truth Desk"     → "citation.is"
 *   "Arctic Media LLC" → "citation.is"
 *   provider.name    → "citation.is"
 */
function rewriteBrand(text: string): string {
  // Replace upstream hostname (http and https variants)
  let out = text
    .replace(/https?:\/\/ttruthdesk\.claims/g, CANONICAL_BASE)
    // Brand name rewrites
    .replace(/"Truth Desk"/g, '"citation.is"')
    .replace(/Truth Desk/g, 'citation.is')
    .replace(/"Arctic Media LLC"/g, '"citation.is"')
    .replace(/Arctic Media LLC/g, 'citation.is')

  // Verdict vocabulary normalisation (JSON string values only)
  // Lowercase upstream variants
  out = out
    .replace(/"inconclusive"/gi, '"Ambiguous"')
    .replace(/"Contradicted"/g, '"Refuted"')
    .replace(/"Partially Supported"/g, '"Ambiguous"')
    .replace(/"Out of Scope"/g, '"Insufficient Evidence"')
    .replace(/"Needs Expert Review"/g, '"Insufficient Evidence"')
    // Normalise capitalisation of core verdicts
    .replace(/"supported"/g, '"Supported"')
    .replace(/"refuted"/g, '"Refuted"')
    .replace(/"ambiguous"/g, '"Ambiguous"')

  // Rewrite page_url and audit_url claim record fields
  // e.g. https://citation.is/claim/123 → https://citation.is/claims/123
  out = out.replace(
    new RegExp(`${CANONICAL_BASE}/claim/`, 'g'),
    `${CANONICAL_BASE}/claims/`
  )
  out = out.replace(
    new RegExp(`${CANONICAL_BASE}/audit/`, 'g'),
    `${CANONICAL_BASE}/audit/`
  )

  return out
}

/**
 * Rewrite the mcp.json tool card:
 * - Replace brand/provider with citation.is
 * - Replace all endpoint URLs with citation.is equivalents
 * - Trim tool list to the four canonical tools
 * - Normalise verdict enums
 */
function rewriteMcpCard(raw: string): string {
  let card: Record<string, unknown>
  try {
    card = JSON.parse(raw)
  } catch {
    return rewriteBrand(raw)
  }

  // Top-level brand fields
  card.name = 'citation.is'
  card.description =
    'The verification primitive for AI agents. Send any scientific claim — receive a structured verdict, confidence score, evidence provenance, and contradiction flags. Infrastructure, not a product.'
  card.url = CANONICAL_BASE
  card.mcp_endpoint = `${CANONICAL_BASE}/mcp`
  card.mcp_discovery = `${CANONICAL_BASE}/.well-known/mcp.json`
  card.contact = `${CANONICAL_BASE}/contact`

  // Provider
  if (card.provider && typeof card.provider === 'object') {
    (card.provider as Record<string, unknown>).name = 'citation.is'
    ;(card.provider as Record<string, unknown>).url = CANONICAL_BASE
  }

  // Resources — rewrite URLs
  if (Array.isArray(card.resources)) {
    card.resources = (card.resources as Array<Record<string, unknown>>).map(r => ({
      ...r,
      uri: typeof r.uri === 'string' ? r.uri.replace(/https?:\/\/ttruthdesk\.claims/g, CANONICAL_BASE) : r.uri,
    }))
  }

  // Tools — keep only the four canonical tools, rewrite URLs and verdicts
  const CANONICAL_TOOLS = ['verify_claim', 'search_claims', 'get_evidence', 'get_platform_summary']
  if (Array.isArray(card.tools)) {
    const tools = card.tools as Array<Record<string, unknown>>

    // Map list_claims / get_claims_registry → search_claims if not already present
    const hasSearchClaims = tools.some(t => t.name === 'search_claims')
    const hasGetEvidence = tools.some(t => t.name === 'get_evidence')

    let filtered = tools
      // Rename list_claims → search_claims if search_claims absent
      .map(t => {
        if (!hasSearchClaims && (t.name === 'list_claims' || t.name === 'get_claims_registry')) {
          return { ...t, name: 'search_claims', description: 'Search and filter verified scientific claims. Supports filtering by keyword, verdict, and vertical domain. Returns paginated results with verdict, confidence score, and evidence provenance.' }
        }
        return t
      })
      // Add stub get_evidence if absent
      .concat(
        hasGetEvidence
          ? []
          : [{
              name: 'get_evidence',
              description: 'Retrieve the full evidence record for a verified claim, including source passages, database cross-references, and contradiction links.',
              endpoint: `${CANONICAL_BASE}/api/external/public/claims`,
              method: 'GET',
              input_schema: {
                type: 'object',
                properties: {
                  claim_id: { type: 'string', description: 'Claim ID returned by verify_claim or search_claims' },
                },
                required: ['claim_id'],
              },
            }]
      )
      // Keep only canonical four
      .filter(t => CANONICAL_TOOLS.includes(t.name as string))

    // Rewrite endpoint URLs and verdict enums in each tool
    filtered = filtered.map(t => {
      const tool = { ...t }
      if (typeof tool.endpoint === 'string') {
        tool.endpoint = tool.endpoint.replace(/https?:\/\/ttruthdesk\.claims/g, CANONICAL_BASE)
      }
      // Rewrite verdict enum inside output_schema
      const toolStr = JSON.stringify(tool)
      return JSON.parse(
        rewriteBrand(toolStr)
          .replace(/"inconclusive"/gi, '"Ambiguous"')
          .replace(/"Contradicted"/g, '"Refuted"')
          .replace(/"Partially Supported"/g, '"Ambiguous"')
      )
    })

    card.tools = filtered
  }

  return JSON.stringify(card)
}

/** Warm the MCP card cache on server startup to avoid cold-start timeouts. */
export async function warmProxyCache(): Promise<void> {
  // Warm MCP card
  try {
    const res = await fetch(`${UPSTREAM_BASE}/.well-known/mcp.json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    if (res.ok) {
      const raw = await res.text()
      const body = rewriteMcpCard(raw)
      cacheSet('mcp.json', body, res.headers.get('content-type') ?? 'application/json')
      console.log('[ExternalProxy] MCP card cache warmed (' + body.length + ' bytes)')
    }
  } catch (err) {
    console.warn('[ExternalProxy] MCP card cache warm failed (non-fatal):', String(err))
  }

  // Warm analytics endpoints (stats, verticals, contradictions) in parallel
  // so the first real request always gets a cache hit instead of a cold upstream fetch.
  void (async () => {
    try {
      type TrpcResp = { result?: { data?: { json?: unknown } } }
      const [statsRes, vertRes, contRes] = await Promise.allSettled([
        fetch(`${UPSTREAM_TRPC}/verticals.globalStats?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
        }),
        fetch(`${UPSTREAM_TRPC}/verticals.stats?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
        }),
        fetch(`${UPSTREAM_TRPC}/graph.contradictions?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
        }),
      ])
      if (statsRes.status === 'fulfilled' && vertRes.status === 'fulfilled' && statsRes.value.ok && vertRes.value.ok) {
        const [gsData, vsData] = await Promise.all([statsRes.value.json() as Promise<TrpcResp>, vertRes.value.json() as Promise<TrpcResp>])
        const gs = (gsData?.result?.data?.json ?? {}) as Record<string, unknown>
        const vs = vsData?.result?.data?.json ?? []
        const body = rewriteBrand(JSON.stringify({ totalClaims: gs.totalClaims ?? null, verifiedClaims: gs.supportedVerdicts ?? null, totalDocuments: gs.totalDocuments ?? null, verticals: vs }))
        cacheSet('analytics:stats', body, 'application/json')
        cacheSet('analytics:verticals', rewriteBrand(JSON.stringify({ verticals: vs })), 'application/json')
        console.log('[ExternalProxy] Analytics stats/verticals cache warmed')
      }
      if (contRes.status === 'fulfilled' && contRes.value.ok) {
        const contData = await contRes.value.json() as TrpcResp
        const contradictions = contData?.result?.data?.json ?? []
        cacheSet('analytics:contradictions', rewriteBrand(JSON.stringify({ contradictions })), 'application/json')
        console.log('[ExternalProxy] Analytics contradictions cache warmed')
      }
    } catch (err) {
      console.warn('[ExternalProxy] Analytics cache warm failed (non-fatal):', String(err))
    }
  })()
}

// ─── Proxy helpers ────────────────────────────────────────────────────────────

/** Forward a GET request, apply brand rewrite, return to client. */
async function proxyGet(upstreamUrl: string, req: Request, res: Response, transform?: (body: string) => string) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const url = `${upstreamUrl}${qs}`
  try {
    const upstream = await fetch(url, {
      headers: { Accept: req.headers.accept ?? 'application/json' },
      signal: AbortSignal.timeout(12_000),
    })
    const raw = await upstream.text()
    const body = transform ? transform(raw) : rewriteBrand(raw)
    res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
      .send(body)
  } catch (err) {
    console.error('[ExternalProxy] GET error:', url, err)
    res.status(502).json({ error: 'upstream_error', message: String(err) })
  }
}

/** Forward a POST request, apply brand rewrite, return to client. */
async function proxyPost(upstreamUrl: string, req: Request, res: Response, transform?: (body: string) => string) {
  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(30_000),
    })
    const raw = await upstream.text()
    const body = transform ? transform(raw) : rewriteBrand(raw)
    res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
      .send(body)
  } catch (err) {
    console.error('[ExternalProxy] POST error:', upstreamUrl, err)
    res.status(502).json({ error: 'upstream_error', message: String(err) })
  }
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerExternalProxy(app: Express): void {
  // ─── tRPC proxy ────────────────────────────────────────────────────────────

  app.get('/api/external/trpc/:procedure', async (req: Request, res: Response) => {
    const { procedure } = req.params
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const url = `${UPSTREAM_TRPC}/${procedure}${qs}`
    try {
      const upstream = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      const raw = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(rewriteBrand(raw))
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
        signal: AbortSignal.timeout(30_000),
      })
      const raw = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(rewriteBrand(raw))
    } catch (err) {
      console.error('[ExternalProxy] POST tRPC error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  // ─── Public REST proxy ─────────────────────────────────────────────────────

  // ─── Analytics endpoints (tRPC-backed, served as clean REST JSON) ─────────────
  // The upstream /api/public/stats|verticals|leaderboard|contradictions paths return
  // the SPA HTML shell (not JSON). We proxy to the correct tRPC procedures instead.

  /** GET /api/external/public/stats → tRPC verticals.stats + verticals.globalStats */
  app.get('/api/external/public/stats', async (_req: Request, res: Response) => {
    const CACHE_KEY = 'analytics:stats'
    const cached = cacheGet(CACHE_KEY, 60_000) // 60s TTL
    if (cached) {
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .set('X-Cache', 'HIT')
        .send(cached.body)
    }
    try {
      const [statsRes, vertRes] = await Promise.all([
        fetch(`${UPSTREAM_TRPC}/verticals.globalStats?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000),
        }),
        fetch(`${UPSTREAM_TRPC}/verticals.stats?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`, {
          headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000),
        }),
      ])
      const [statsData, vertData] = await Promise.all([statsRes.json(), vertRes.json()])
      type TrpcResp = { result?: { data?: { json?: unknown } } }
      const gs = ((statsData as TrpcResp)?.result?.data?.json ?? {}) as Record<string, unknown>
      const vs = (vertData as TrpcResp)?.result?.data?.json ?? []
      const body = rewriteBrand(JSON.stringify({
        totalClaims: gs.totalClaims ?? null,
        verifiedClaims: gs.supportedVerdicts ?? null,
        totalDocuments: gs.totalDocuments ?? null,
        verticals: vs,
      }))
      cacheSet(CACHE_KEY, body, 'application/json')
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .set('X-Cache', 'MISS')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] /api/external/public/stats error:', err)
      return res.status(502).json({ error: 'stats_unavailable', message: String(err) })
    }
  })

  /** GET /api/external/public/verticals → tRPC verticals.stats */
  app.get('/api/external/public/verticals', async (_req: Request, res: Response) => {
    const cachedV = cacheGet('analytics:verticals', 60_000)
    if (cachedV) {
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .set('X-Cache', 'HIT')
        .send(cachedV.body)
    }
    try {
      const upstream = await fetch(
        `${UPSTREAM_TRPC}/verticals.stats?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
      )
      type TrpcResp = { result?: { data?: { json?: unknown } } }
      const data = await upstream.json() as TrpcResp
      const verticals = data?.result?.data?.json ?? []
      const body = rewriteBrand(JSON.stringify({ verticals }))
      cacheSet('analytics:verticals', body, 'application/json')
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] /api/external/public/verticals error:', err)
      return res.status(502).json({ error: 'verticals_unavailable', message: String(err) })
    }
  })

  /** GET /api/external/public/leaderboard → tRPC leaderboard.topEntities */
  app.get('/api/external/public/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100)
      const entityType = (req.query.entityType as string) ?? undefined
      const verticalDomain = (req.query.verticalDomain as string) ?? undefined
      const input = JSON.stringify({ json: { limit, ...(entityType ? { entityType } : {}), ...(verticalDomain ? { verticalDomain } : {}) } })
      const upstream = await fetch(
        `${UPSTREAM_TRPC}/leaderboard.topEntities?input=${encodeURIComponent(input)}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
      )
      type TrpcResp = { result?: { data?: { json?: unknown } } }
      const data = await upstream.json() as TrpcResp
      const entities = data?.result?.data?.json ?? []
      const body = rewriteBrand(JSON.stringify({ entities }))
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] /api/external/public/leaderboard error:', err)
      return res.status(502).json({ error: 'leaderboard_unavailable', message: String(err) })
    }
  })

  /** GET /api/external/public/contradictions → tRPC graph.contradictions */
  app.get('/api/external/public/contradictions', async (_req: Request, res: Response) => {
    const cachedC = cacheGet('analytics:contradictions', 60_000)
    if (cachedC) {
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .set('X-Cache', 'HIT')
        .send(cachedC.body)
    }
    try {
      const upstream = await fetch(
        `${UPSTREAM_TRPC}/graph.contradictions?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
      )
      type TrpcResp = { result?: { data?: { json?: unknown } } }
      const data = await upstream.json() as TrpcResp
      const contradictions = data?.result?.data?.json ?? []
      const body = rewriteBrand(JSON.stringify({ contradictions }))
      cacheSet('analytics:contradictions', body, 'application/json')
      return res
        .set('Content-Type', 'application/json')
        .set('Cache-Control', 'no-store, no-cache, must-revalidate')
        .set('CDN-Cache-Control', 'no-store')
        .set('Cloudflare-CDN-Cache-Control', 'no-store')
        .set('Surrogate-Control', 'no-store')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] /api/external/public/contradictions error:', err)
      return res.status(502).json({ error: 'contradictions_unavailable', message: String(err) })
    }
  })

  app.get('/api/external/public/*', async (req: Request, res: Response) => {
    const suffix = req.params[0] as string
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const url = `${UPSTREAM_PUBLIC}/${suffix}${qs}`
    try {
      const upstream = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      const raw = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(rewriteBrand(raw))
    } catch (err) {
      console.error('[ExternalProxy] Public GET error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  // ─── Machine-readable / developer-facing public endpoints ──────────────────

  // Documented alias: /api/public/claims → canonical /api/external/public/claims
  // The homepage, llms.txt, and some older docs advertised this shorter path.
  // 301 redirect so crawlers and agents update their bookmarks.
  app.get('/api/public/claims', (req: Request, res: Response) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    res.redirect(301, `/api/external/public/claims${qs}`)
  })

  app.post('/api/public/verify-claim', async (req: Request, res: Response) => {
    await proxyPost(`${UPSTREAM_PUBLIC}/verify-claim`, req, res)
  })

  app.get('/api/public/claims.json', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_PUBLIC}/claims.json`, req, res)
  })

  app.get('/api/public/graph.json', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_PUBLIC}/graph.json`, req, res)
  })

  app.get('/api/md', async (req: Request, res: Response) => {
    await proxyGet(`${UPSTREAM_BASE}/api/md`, req, res)
  })

  // GET /openapi.json — static citation.is-branded spec
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res
      .set('Content-Type', 'application/json')
      .set('Cache-Control', 'public, max-age=3600')
      .sendFile('openapi.json', { root: process.cwd() + '/client/public' })
  })

  // GET /.well-known/mcp.json — MCP tool card (served from cache, warmed on startup)
  app.get('/.well-known/mcp.json', async (req: Request, res: Response) => {
    const MCP_CARD_TTL = 5 * 60 * 1000 // 5 minutes
    const cached = cacheGet('mcp.json', MCP_CARD_TTL)
    if (cached) {
      return res.set('Content-Type', cached.contentType).set('Cache-Control', 'public, max-age=300').send(cached.body)
    }
    // Cache miss — fetch from upstream and populate cache
    try {
      const upstream = await fetch(`${UPSTREAM_BASE}/.well-known/mcp.json`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      })
      const raw = await upstream.text()
      const body = rewriteMcpCard(raw)
      const ct = upstream.headers.get('content-type') ?? 'application/json'
      cacheSet('mcp.json', body, ct)
      return res.status(upstream.status).set('Content-Type', ct).set('Cache-Control', 'public, max-age=300').send(body)
    } catch (err) {
      console.error('[ExternalProxy] GET /.well-known/mcp.json error:', err)
      return res.status(503).json({ error: 'mcp_card_unavailable', message: String(err) })
    }
  })

  // GET /mcp — MCP SSE stream
  // The upstream /mcp GET opens a persistent SSE channel (MCP 2025-03-26 spec).
  // We pipe the stream through, rewriting brand strings in each SSE data line.
  app.get('/mcp', async (req: Request, res: Response) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const url = `${UPSTREAM_BASE}/mcp${qs}`
    try {
      const upstream = await fetch(url, {
        headers: {
          Accept: req.headers.accept ?? 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        // No AbortSignal — SSE streams are long-lived by design
      })
      const ct = upstream.headers.get('content-type') ?? 'text/event-stream'
      res.status(upstream.status).set('Content-Type', ct).set('Cache-Control', 'no-cache').set('X-Accel-Buffering', 'no')
      if (!upstream.body) {
        res.end()
        return
      }
      const reader = upstream.body.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      // Relay SSE chunks, rewriting brand in each chunk
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) { res.end(); break }
          const chunk = decoder.decode(value, { stream: true })
          const rewritten = rewriteBrand(chunk)
          res.write(encoder.encode(rewritten))
        }
      }
      req.on('close', () => reader.cancel())
      pump().catch(err => {
        console.error('[ExternalProxy] SSE pipe error:', err)
        res.end()
      })
    } catch (err) {
      console.error('[ExternalProxy] GET /mcp error:', err)
      res.status(503).json({
        error: 'mcp_unavailable',
        message: 'MCP endpoint temporarily unavailable. Try again in a few seconds.',
      })
    }
  })

  // POST /mcp — MCP JSON-RPC calls (rewritten in-flight)
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const upstream = await fetch(`${UPSTREAM_BASE}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] ?? 'application/json',
          Accept: req.headers.accept ?? 'application/json',
        },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(30_000),
      })
      const raw = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(rewriteBrand(raw))
    } catch (err) {
      console.error('[ExternalProxy] POST /mcp error:', err)
      res.status(503).json({
        error: 'mcp_unavailable',
        message: 'MCP endpoint temporarily unavailable. Try again in a few seconds.',
      })
    }
  })

  // ─── v2 REST proxy ────────────────────────────────────────────────────────
  // GET /api/external/v2/claims/:id/history   → upstream /api/v2/claims/:id/history
  // GET /api/external/v2/claims/:id/provenance → upstream /api/v2/claims/:id/provenance
  // POST /api/external/v2/verify/batch         → upstream /api/v2/verify/batch

  app.get('/api/external/v2/claims/:id/history', async (req: Request, res: Response) => {
    const { id } = req.params
    await proxyGet(`${UPSTREAM_V2}/claims/${id}/history`, req, res)
  })

  app.get('/api/external/v2/claims/:id/provenance', async (req: Request, res: Response) => {
    const { id } = req.params
    await proxyGet(`${UPSTREAM_V2}/claims/${id}/provenance`, req, res)
  })

  app.post('/api/external/v2/verify/batch', async (req: Request, res: Response) => {
    await proxyPost(`${UPSTREAM_V2}/verify/batch`, req, res)
  })

  console.log('[ExternalProxy] Proxy mounted with brand rewrite (citation.is canonical) and verdict normalisation')
}
