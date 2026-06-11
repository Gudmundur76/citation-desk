/**
 * Agent-readiness middleware for citation.is
 *
 * 1. Link response headers — injected via res.writeHead interception so they
 *    are present on ALL response paths: res.send, res.sendFile, res.end, and
 *    Vite's internal streaming. This ensures Cloudflare edge caches and
 *    scanners like isitagentready.com see the headers.
 *
 *    Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 *    Spec: https://www.iana.org/assignments/link-relations/
 *
 * 2. Markdown content negotiation — when a request arrives with
 *    Accept: text/markdown (or Accept: text/plain with q > 0), the server
 *    proxies /api/md from the upstream and returns it as text/markdown.
 *
 * 3. /.well-known/api-catalog content-type fix — served as
 *    application/linkset+json as required by the API Catalog spec.
 *
 * 4. Content-Signals header on robots.txt responses — satisfies the
 *    "Content Signals in robots.txt" check on isitagentready.com.
 */
import type { Express, Request, Response, NextFunction } from 'express'

const UPSTREAM_BASE = 'https://ttruthdesk.claims'

const LINK_HEADER_VALUE = [
  // Markdown alternate (RFC 9110 content negotiation)
  '</api/md>; rel="alternate"; type="text/markdown"; title="Markdown summary"',
  // OpenAPI spec (IANA service-desc)
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.0"',
  // API catalog (RFC 9727)
  '</.well-known/api-catalog>; rel="https://www.iana.org/assignments/link-relations/api-catalog"',
  // MCP server card (SEP-1649)
  '</.well-known/mcp/server-card.json>; rel="mcp-server-card"',
  // Agent skills index (Cloudflare Agent Skills Discovery RFC)
  '</.well-known/agent-skills/index.json>; rel="agent-skills"',
  // A2A agent card
  '</.well-known/agent-card.json>; rel="agent-card"',
  // OAI-PMH
  '</oai>; rel="alternate"; type="application/xml"; title="OAI-PMH endpoint"',
].join(', ')

/**
 * Injects Link headers by monkey-patching writeHead so the header is present
 * regardless of which Express/Node response method is used (send, sendFile,
 * end, pipe, etc.).
 */
function linkHeaderMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalWriteHead = res.writeHead.bind(res) as typeof res.writeHead

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(res as any).writeHead = function (statusCode: number, reasonOrHeaders?: unknown, headers?: unknown) {
    // Only inject on HTML responses
    const ct = res.getHeader('content-type') as string | undefined
    if (!ct || ct.includes('text/html')) {
      res.setHeader('Link', LINK_HEADER_VALUE)
    }
    if (typeof reasonOrHeaders === 'string') {
      return (originalWriteHead as (s: number, r: string, h?: unknown) => Response)(statusCode, reasonOrHeaders, headers)
    }
    return (originalWriteHead as (s: number, h?: unknown) => Response)(statusCode, reasonOrHeaders)
  }
  next()
}

/**
 * Markdown content negotiation.
 * When Accept header prefers text/markdown or text/plain, proxy /api/md.
 */
async function markdownNegotiationMiddleware(req: Request, res: Response, next: NextFunction) {
  const accept = req.headers.accept ?? ''
  const wantsMarkdown =
    accept.includes('text/markdown') ||
    (accept.includes('text/plain') && !accept.includes('text/html') && !req.path.includes('.'))

  if (
    req.method !== 'GET' ||
    !wantsMarkdown ||
    req.path.startsWith('/api/') ||
    req.path.startsWith('/manus-storage/') ||
    req.path.includes('.')
  ) {
    return next()
  }

  try {
    const upstream = await fetch(`${UPSTREAM_BASE}/api/md`, {
      headers: { Accept: 'text/markdown, text/plain' },
      signal: AbortSignal.timeout(5000),
    })
    const body = await upstream.text()
    res
      .status(200)
      .set('Content-Type', 'text/markdown; charset=utf-8')
      .set('Link', LINK_HEADER_VALUE)
      .send(body)
  } catch {
    next()
  }
}

/**
 * Fix Content-Type for /.well-known/api-catalog to application/linkset+json.
 */
function apiCatalogContentType(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/.well-known/api-catalog') {
    res.setHeader('Content-Type', 'application/linkset+json')
  }
  next()
}

/**
 * Add Content-Signals header to robots.txt responses.
 * Spec: https://contentsignals.org/
 * Signals: dataset (CC BY 4.0 open data), no-ai-training-restriction
 */
function contentSignalsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/robots.txt') {
    res.setHeader(
      'Content-Signals',
      'dataset; license="https://creativecommons.org/licenses/by/4.0/"; ai-training="allowed"'
    )
  }
  next()
}

export function registerAgentHeaders(app: Express): void {
  app.use(apiCatalogContentType)
  app.use(contentSignalsMiddleware)
  app.use(markdownNegotiationMiddleware)
  app.use(linkHeaderMiddleware)
  console.log('[AgentHeaders] Link headers, Markdown negotiation, API Catalog content-type, Content-Signals registered')
}
