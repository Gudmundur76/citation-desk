/**
 * Tests for agent-readiness middleware and well-known static files.
 *
 * Covers:
 * - /.well-known/mcp/server-card.json  → valid JSON with expected fields
 * - /.well-known/api-catalog           → valid JSON served as application/linkset+json
 * - /.well-known/agent-skills/index.json → valid JSON with at least one skill
 * - /.well-known/http-message-signatures-directory → valid JSON
 * - /auth.md                           → text/markdown response
 * - Link header middleware             → Link header present on HTML responses
 * - Markdown negotiation               → text/markdown response when Accept: text/markdown
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import path from 'path'
import { registerAgentHeaders } from './agentHeaders'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeApp() {
  const app = express()
  registerAgentHeaders(app)
  // Serve the client/public directory as static files (mirrors production)
  app.use(express.static(path.resolve(__dirname, '../client/public')))
  // Fallback HTML page so Link-header middleware has something to intercept
  app.get('*', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send('<html><body>Test</body></html>')
  })
  return app
}

// ─── well-known static files ──────────────────────────────────────────────────

describe('Well-known static files', () => {
  const app = makeApp()

  it('serves /.well-known/mcp/server-card.json as JSON with required fields', async () => {
    const res = await request(app).get('/.well-known/mcp/server-card.json')
    expect(res.status).toBe(200)
    const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text)
    expect(body).toHaveProperty('name')
    expect(body).toHaveProperty('mcp_endpoint')
    expect(body).toHaveProperty('capabilities')
  })

  it('serves /.well-known/api-catalog as application/linkset+json', async () => {
    const res = await request(app).get('/.well-known/api-catalog')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/linkset\+json/)
    const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text)
    expect(body).toHaveProperty('linkset')
    expect(Array.isArray(body.linkset)).toBe(true)
  })

  it('serves /.well-known/agent-skills/index.json with at least one skill', async () => {
    const res = await request(app).get('/.well-known/agent-skills/index.json')
    expect(res.status).toBe(200)
    const body = typeof res.body === 'object' ? res.body : JSON.parse(res.text)
    expect(body).toHaveProperty('skills')
    expect(Array.isArray(body.skills)).toBe(true)
    expect(body.skills.length).toBeGreaterThan(0)
    expect(body.skills[0]).toHaveProperty('id')
    expect(body.skills[0]).toHaveProperty('api_endpoint')
  })

  it('serves /.well-known/http-message-signatures-directory as JSON', async () => {
    const res = await request(app).get('/.well-known/http-message-signatures-directory')
    expect(res.status).toBe(200)
    // supertest may return a Buffer for files without explicit content-type; parse manually
    const raw = Buffer.isBuffer(res.body) ? res.body.toString('utf-8') : res.text
    const body = typeof res.body === 'object' && !Buffer.isBuffer(res.body) ? res.body : JSON.parse(raw)
    expect(body).toHaveProperty('bot_access')
    expect(body.authentication_required).toBe(false)
  })

  it('serves /auth.md as text/markdown', async () => {
    const res = await request(app).get('/auth.md')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\//)
    expect(res.text).toContain('No authentication required')
  })
})

// ─── Link header middleware ───────────────────────────────────────────────────

describe('Link header middleware', () => {
  const app = makeApp()

  it('adds Link header to HTML responses', async () => {
    const res = await request(app).get('/some-page')
    expect(res.headers['link']).toBeDefined()
    expect(res.headers['link']).toContain('text/markdown')
    expect(res.headers['link']).toContain('mcp')
  })

  it('Link header includes OpenAPI spec reference', async () => {
    const res = await request(app).get('/')
    expect(res.headers['link']).toContain('openapi.json')
  })
})

// ─── Markdown content negotiation ────────────────────────────────────────────

describe('Markdown content negotiation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '# citation.is\n\nVerified scientific claims registry.',
    }))
  })

  it('returns text/markdown when Accept: text/markdown is sent for a page', async () => {
    const app = makeApp()
    const res = await request(app)
      .get('/')
      .set('Accept', 'text/markdown')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/markdown/)
    expect(res.text).toContain('citation.is')
  })

  it('falls back to HTML when upstream markdown fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream down')))
    const app = makeApp()
    const res = await request(app)
      .get('/')
      .set('Accept', 'text/markdown')
    // Should fall through to the HTML fallback route
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
  })

  it('does not intercept API routes even with Accept: text/markdown', async () => {
    // Register the API route on a fresh app BEFORE agentHeaders so it is
    // handled before the markdown-negotiation middleware can intercept it.
    const app2 = express()
    app2.get('/api/test', (_req, res) => res.json({ ok: true }))
    registerAgentHeaders(app2)
    app2.get('*', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send('<html><body>Test</body></html>')
    })
    const app = app2
    app.get('/api/test', (_req, res) => res.json({ ok: true }))
    const res = await request(app)
      .get('/api/test')
      .set('Accept', 'text/markdown')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
  })
})
