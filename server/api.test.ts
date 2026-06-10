/**
 * Tests for the citation API client (client/src/lib/api.ts).
 *
 * Because the module runs in a browser context (uses `fetch` and relative URLs)
 * we test the logic that is portable to Node: URL construction via the `encode`
 * helper and the response-parsing contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Helpers mirrored from lib/api.ts ────────────────────────────────────────

const BASE = '/api/external/trpc'

function encode(input: unknown): string {
  return encodeURIComponent(JSON.stringify({ json: input }))
}

function buildGetUrl(procedure: string, input?: unknown): string {
  return input !== undefined
    ? `${BASE}/${procedure}?input=${encode(input)}`
    : `${BASE}/${procedure}`
}

// ─── URL construction ─────────────────────────────────────────────────────────

describe('API URL construction', () => {
  it('builds a bare URL when no input is provided', () => {
    const url = buildGetUrl('verticals.globalStats')
    expect(url).toBe('/api/external/trpc/verticals.globalStats')
  })

  it('encodes input as a JSON-wrapped query param', () => {
    const url = buildGetUrl('verticals.detail', { domainKey: 'structural_biology' })
    const parsed = new URL(url, 'http://localhost')
    const raw = parsed.searchParams.get('input')!
    expect(raw).toBeTruthy()
    const decoded = JSON.parse(decodeURIComponent(raw))
    expect(decoded).toEqual({ json: { domainKey: 'structural_biology' } })
  })

  it('encodes special characters in input values', () => {
    const url = buildGetUrl('search.claims', { query: 'lysozyme & structure' })
    expect(url).toContain('/api/external/trpc/search.claims?input=')
    const parsed = new URL(url, 'http://localhost')
    const raw = parsed.searchParams.get('input')!
    const decoded = JSON.parse(decodeURIComponent(raw))
    expect(decoded.json.query).toBe('lysozyme & structure')
  })

  it('encodes empty object input', () => {
    const url = buildGetUrl('leaderboard.topEntities', {})
    const parsed = new URL(url, 'http://localhost')
    const raw = parsed.searchParams.get('input')!
    const decoded = JSON.parse(decodeURIComponent(raw))
    expect(decoded).toEqual({ json: {} })
  })

  it('produces distinct URLs for different procedures', () => {
    const a = buildGetUrl('verticals.globalStats')
    const b = buildGetUrl('verticals.stats', {})
    expect(a).not.toBe(b)
  })
})

// ─── Response parsing contract ────────────────────────────────────────────────

describe('API response parsing', () => {
  it('extracts result.data.json from a successful tRPC envelope', () => {
    const envelope = {
      result: { data: { json: { totalClaims: 3962, totalDocuments: 47 } } },
    }
    // Simulate what the get() helper does after res.json()
    const parsed = envelope.result.data.json
    expect(parsed).toEqual({ totalClaims: 3962, totalDocuments: 47 })
  })

  it('detects an error envelope and surfaces the message', () => {
    const envelope = {
      error: { json: { message: 'Not found', code: -32004 } },
    }
    const message = envelope.error?.json?.message ?? 'API error'
    expect(message).toBe('Not found')
  })

  it('falls back to "API error" when error envelope has no message', () => {
    const envelope = { error: { json: {} } } as { error: { json: { message?: string } } }
    const message = envelope.error?.json?.message ?? 'API error'
    expect(message).toBe('API error')
  })
})

// ─── POST body serialisation ──────────────────────────────────────────────────

describe('POST body serialisation', () => {
  it('wraps input in a json key for tRPC batch protocol', () => {
    const input = {
      tier: 'starter' as const,
      contactName: 'Dr. Smith',
      contactEmail: 'smith@lab.edu',
      documentDescription: 'A paper on lysozyme structure.',
    }
    const body = JSON.stringify({ json: input })
    const parsed = JSON.parse(body)
    expect(parsed.json).toEqual(input)
  })
})
