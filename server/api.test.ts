/**
 * Tests for client/src/lib/api.ts
 *
 * Pure logic tests: URL construction, input encoding,
 * response envelope parsing, and error handling.
 */
import { describe, it, expect } from 'vitest'

const BASE = '/api/external/trpc'

function encode(input: unknown): string {
  return encodeURIComponent(JSON.stringify({ json: input }))
}

function buildGetUrl(procedure: string, input?: unknown): string {
  return input !== undefined
    ? `${BASE}/${procedure}?input=${encode(input)}`
    : `${BASE}/${procedure}`
}

function parseEnvelope<T>(data: unknown): T {
  const d = data as Record<string, unknown>
  if (d.error) {
    const err = d.error as Record<string, unknown>
    const msg = (err.json as Record<string, unknown>)?.message ?? 'API error'
    throw new Error(msg as string)
  }
  return ((d.result as Record<string, unknown>).data as Record<string, unknown>).json as T
}

describe('buildGetUrl', () => {
  it('builds a URL without input', () => {
    expect(buildGetUrl('verticals.globalStats')).toBe('/api/external/trpc/verticals.globalStats')
  })

  it('builds a URL with object input', () => {
    const url = buildGetUrl('verticals.detail', { domainKey: 'structural_biology' })
    expect(url).toContain('/api/external/trpc/verticals.detail?input=')
    const raw = decodeURIComponent(url.split('?input=')[1])
    expect(JSON.parse(raw)).toEqual({ json: { domainKey: 'structural_biology' } })
  })

  it('encodes special characters in input', () => {
    const url = buildGetUrl('search.unified', { query: 'lysozyme & beta-lactamase' })
    const raw = decodeURIComponent(url.split('?input=')[1])
    expect(JSON.parse(raw).json.query).toBe('lysozyme & beta-lactamase')
  })

  it('wraps input in a json envelope', () => {
    const url = buildGetUrl('leaderboard.topEntities', { limit: 10 })
    const raw = decodeURIComponent(url.split('?input=')[1])
    expect(JSON.parse(raw)).toEqual({ json: { limit: 10 } })
  })

  it('handles empty object input', () => {
    const url = buildGetUrl('verticals.stats', {})
    const raw = decodeURIComponent(url.split('?input=')[1])
    expect(JSON.parse(raw)).toEqual({ json: {} })
  })
})

describe('parseEnvelope', () => {
  it('extracts data from a success envelope', () => {
    const envelope = { result: { data: { json: { totalDocuments: 100, totalClaims: 500 } } } }
    const result = parseEnvelope<{ totalDocuments: number; totalClaims: number }>(envelope)
    expect(result.totalDocuments).toBe(100)
    expect(result.totalClaims).toBe(500)
  })

  it('throws when envelope contains an error with a message', () => {
    expect(() => parseEnvelope({ error: { json: { message: 'Not found' } } })).toThrow('Not found')
  })

  it('throws a generic message when error has no message field', () => {
    expect(() => parseEnvelope({ error: { json: {} } })).toThrow('API error')
  })

  it('handles array results', () => {
    const envelope = { result: { data: { json: [{ id: 1, canonicalName: 'Lysozyme' }] } } }
    const result = parseEnvelope<Array<{ id: number; canonicalName: string }>>(envelope)
    expect(result).toHaveLength(1)
    expect(result[0].canonicalName).toBe('Lysozyme')
  })
})
