/**
 * Vitest tests for the /api/external/public/* proxy endpoints.
 *
 * These tests verify that the Express proxy correctly forwards requests to
 * the ttruthdesk.claims public REST API and returns well-formed responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { registerExternalProxy } from './externalProxy'

// ─── Mock global fetch ────────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeUpstreamResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: { get: () => 'application/json' },
  }
}

// ─── Test app setup ───────────────────────────────────────────────────────────

function buildApp() {
  const app = express()
  app.use(express.json())
  registerExternalProxy(app)
  return app
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Public REST proxy — /api/external/public/*', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('proxies GET /claims to the upstream paginated list', async () => {
    const mockPage = {
      page: 1,
      page_size: 2,
      total: 3863,
      total_pages: 1932,
      filters: { verdict: null, vertical: null, claim_type: null, updated_since: null, q: null },
      claims: [
        {
          id: 'ptd-270001-300002',
          claim_id: 300002,
          verdict: 'Supported',
          claim_text: 'Fish are exempt from TSE regulations',
        },
      ],
    }
    mockFetch.mockResolvedValueOnce(makeUpstreamResponse(mockPage))

    const app = buildApp()
    const res = await request(app)
      .get('/api/external/public/claims')
      .query({ page: '1', page_size: '2' })

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(3863)
    expect(res.body.claims).toHaveLength(1)
    expect(res.body.claims[0].verdict).toBe('Supported')

    // Verify the upstream URL was constructed correctly
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('ttruthdesk.claims/api/public/claims')
    expect(calledUrl).toContain('page=1')
    expect(calledUrl).toContain('page_size=2')
  })

  it('proxies GET /claims/:id to the upstream claim detail', async () => {
    const mockClaim = {
      claim_id: 300002,
      document_id: 270001,
      document_title: 'Test Document',
      claim_text: 'Fish are exempt from TSE regulations',
      verdict: 'Supported',
      confidence_score: 0.95,
      verdict_rationale: 'EU Regulation 722/2012 explicitly exempts fish.',
      evidence_url: 'https://eur-lex.europa.eu/...',
      jsonld: [],
    }
    mockFetch.mockResolvedValueOnce(makeUpstreamResponse(mockClaim))

    const app = buildApp()
    const res = await request(app).get('/api/external/public/claims/300002')

    expect(res.status).toBe(200)
    expect(res.body.claim_id).toBe(300002)
    expect(res.body.verdict).toBe('Supported')
    expect(res.body.confidence_score).toBe(0.95)

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('ttruthdesk.claims/api/public/claims/300002')
  })

  it('forwards 404 when the upstream returns 404', async () => {
    mockFetch.mockResolvedValueOnce(makeUpstreamResponse({ error: 'Not found' }, 404))

    const app = buildApp()
    const res = await request(app).get('/api/external/public/claims/999999999')

    expect(res.status).toBe(404)
  })

  it('returns 502 when the upstream fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const app = buildApp()
    const res = await request(app).get('/api/external/public/claims')

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('upstream_error')
  })

  it('applies verdict filter to the upstream URL', async () => {
    const mockPage = {
      page: 1, page_size: 10, total: 97, total_pages: 10,
      filters: { verdict: 'Supported', vertical: null, claim_type: null, updated_since: null, q: null },
      claims: [],
    }
    mockFetch.mockResolvedValueOnce(makeUpstreamResponse(mockPage))

    const app = buildApp()
    await request(app)
      .get('/api/external/public/claims')
      .query({ verdict: 'Supported' })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('verdict=Supported')
  })

  it('applies free-text query filter to the upstream URL', async () => {
    const mockPage = {
      page: 1, page_size: 10, total: 5, total_pages: 1,
      filters: { verdict: null, vertical: null, claim_type: null, updated_since: null, q: 'salmon' },
      claims: [],
    }
    mockFetch.mockResolvedValueOnce(makeUpstreamResponse(mockPage))

    const app = buildApp()
    await request(app)
      .get('/api/external/public/claims')
      .query({ q: 'salmon' })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('q=salmon')
  })
})
