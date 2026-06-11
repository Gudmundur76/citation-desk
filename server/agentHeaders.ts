/**
 * Agent-readiness middleware for citation.is
 *
 * 1. Link response headers — added to every HTML response so agents can
 *    discover the Markdown alternate, the OpenAPI spec, the MCP endpoint,
 *    the API catalog, and the agent skills index without parsing HTML.
 *
 *    Spec: https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
 *    Spec: https://www.iana.org/assignments/link-relations/
 *
 * 2. Markdown content negotiation — when a request arrives with
 *    Accept: text/markdown (or Accept: text/plain with q > 0), the server
 *    proxies /api/md from the upstream and returns it as text/markdown.
 *    This satisfies the "Markdown Negotiation" check on isitagentready.com.
 *
 * 3. /.well-known/api-catalog content-type fix — the static file is served
 *    as application/json by default; this middleware overrides it to
 *    application/linkset+json as required by the API Catalog spec.
 */
import type { Express, Request, Response, NextFunction } from 'express'

const UPSTREAM_BASE = 'https://ttruthdesk.claims'

const LINK_HEADERS = [
  // Markdown alternate for the current page
  '</api/md>; rel="alternate"; type="text/markdown"; title="Markdown summary"',
  // OpenAPI spec
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.0"',
  // API catalog
  '</.well-known/api-catalog>; rel="service-desc"; type="application/linkset+json"',
  // MCP endpoint
  '</mcp>; rel="service"',
  // MCP server card
  '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
  // Agent skills index
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
  // OAI-PMH
  '</oai>; rel="alternate"; type="application/xml"; title="OAI-PMH endpoint"',
].join(', ')

/**
 * Adds Link discovery headers to all HTML responses.
 * Must be registered BEFORE Vite / static file middleware.
 */
function linkHeaderMiddleware(req: Request, res: Response, next: NextFunction) {
  // Intercept res.setHeader to inject Link after content-type is known
  const originalSend = res.send.bind(res)
  res.send = function (body: unknown) {
    const ct = res.getHeader('content-type') as string | undefined
    if (!ct || ct.includes('text/html')) {
      res.setHeader('Link', LINK_HEADERS)
    }
    return originalSend(body)
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
    // Some agents send text/plain; only intercept for non-asset paths
    (accept.includes('text/plain') && !accept.includes('text/html') && !req.path.includes('.'))

  // Only apply to page-level GET requests (not API, not assets)
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
      .set('Link', LINK_HEADERS)
      .send(body)
  } catch {
    // Fallback: serve HTML normally
    next()
  }
}

/**
 * Fix Content-Type for /.well-known/api-catalog to application/linkset+json.
 * Static file servers default to application/json or application/octet-stream.
 */
function apiCatalogContentType(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/.well-known/api-catalog') {
    res.setHeader('Content-Type', 'application/linkset+json')
  }
  next()
}

export function registerAgentHeaders(app: Express): void {
  app.use(apiCatalogContentType)
  app.use(markdownNegotiationMiddleware)
  app.use(linkHeaderMiddleware)
  console.log('[AgentHeaders] Link headers, Markdown negotiation, and API Catalog content-type registered')
}
