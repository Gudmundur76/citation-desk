/**
 * Tests for the CitationCopilot readable context builder logic.
 * Tests the pure data transformation functions used to build
 * the CopilotKit readable context from raw API responses.
 */
import { describe, it, expect } from 'vitest'
import type { GlobalStats, VerticalStat, VerticalDetail, LeaderboardEntry } from '../client/src/lib/api'

// ─── Context builder functions (mirrored from CitationCopilot.tsx) ────────────

function buildGlobalStatsContext(stats: GlobalStats | undefined) {
  if (!stats) return 'Loading...'
  return {
    totalDocuments: stats.totalDocuments,
    totalClaims: stats.totalClaims,
    supportedVerdicts: stats.supportedVerdicts,
    verifiedSources: stats.verifiedSources,
  }
}

function buildVerticalContext(
  verticalStats: VerticalStat[] | undefined,
  verticalDetails: VerticalDetail[] | undefined,
) {
  if (!verticalStats || !verticalDetails) return 'Loading...'
  return verticalStats.map(v => {
    const detail = verticalDetails.find(d => d.domainKey === v.domain)
    return {
      domain: v.domain,
      displayName: detail?.displayName ?? v.domain,
      description: detail?.description?.slice(0, 200),
      totalDocuments: v.totalDocs,
      totalClaims: v.totalClaims,
      supportedClaims: v.supportedClaims,
      supportRate:
        v.totalClaims > 0
          ? `${Math.round((v.supportedClaims / v.totalClaims) * 100)}%`
          : '0%',
    }
  })
}

function buildLeaderboardContext(leaderboard: LeaderboardEntry[] | undefined) {
  if (!leaderboard) return 'Loading...'
  return leaderboard.slice(0, 20).map(e => ({
    rank: e.rank,
    name: e.canonicalName,
    type: e.entityType,
    totalCitations: e.totalCitations,
    trend: e.trend,
  }))
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildGlobalStatsContext', () => {
  it('returns Loading... when stats are undefined', () => {
    expect(buildGlobalStatsContext(undefined)).toBe('Loading...')
  })

  it('returns a structured object with all four fields', () => {
    const stats: GlobalStats = {
      totalDocuments: 42,
      totalClaims: 3962,
      supportedVerdicts: 2100,
      verifiedSources: 500,
    }
    const ctx = buildGlobalStatsContext(stats)
    expect(ctx).toEqual({
      totalDocuments: 42,
      totalClaims: 3962,
      supportedVerdicts: 2100,
      verifiedSources: 500,
    })
  })
})

describe('buildVerticalContext', () => {
  it('returns Loading... when either argument is undefined', () => {
    expect(buildVerticalContext(undefined, [])).toBe('Loading...')
    expect(buildVerticalContext([], undefined)).toBe('Loading...')
  })

  it('calculates support rate as a percentage string', () => {
    const stats: VerticalStat[] = [
      { domain: 'structural_biology', totalDocs: 10, completedDocs: 8, totalClaims: 200, supportedClaims: 150 },
    ]
    const details: VerticalDetail[] = [
      { domainKey: 'structural_biology', displayName: 'Structural Biology', description: 'Protein structures', discoverySearchTerms: [] },
    ]
    const ctx = buildVerticalContext(stats, details) as ReturnType<typeof buildVerticalContext>
    expect(Array.isArray(ctx)).toBe(true)
    const first = (ctx as Array<{ supportRate: string }>)[0]
    expect(first.supportRate).toBe('75%')
  })

  it('returns 0% support rate when totalClaims is zero', () => {
    const stats: VerticalStat[] = [
      { domain: 'new_domain', totalDocs: 0, completedDocs: 0, totalClaims: 0, supportedClaims: 0 },
    ]
    const details: VerticalDetail[] = []
    const ctx = buildVerticalContext(stats, details) as Array<{ supportRate: string; displayName: string }>
    expect(ctx[0].supportRate).toBe('0%')
  })

  it('falls back to domain key when no matching detail is found', () => {
    const stats: VerticalStat[] = [
      { domain: 'unknown_domain', totalDocs: 5, completedDocs: 3, totalClaims: 10, supportedClaims: 5 },
    ]
    const ctx = buildVerticalContext(stats, []) as Array<{ displayName: string }>
    expect(ctx[0].displayName).toBe('unknown_domain')
  })

  it('truncates description to 200 characters', () => {
    const longDesc = 'A'.repeat(300)
    const stats: VerticalStat[] = [
      { domain: 'test', totalDocs: 1, completedDocs: 1, totalClaims: 1, supportedClaims: 1 },
    ]
    const details: VerticalDetail[] = [
      { domainKey: 'test', displayName: 'Test', description: longDesc, discoverySearchTerms: [] },
    ]
    const ctx = buildVerticalContext(stats, details) as Array<{ description: string }>
    expect(ctx[0].description.length).toBe(200)
  })
})

describe('buildLeaderboardContext', () => {
  it('returns Loading... when leaderboard is undefined', () => {
    expect(buildLeaderboardContext(undefined)).toBe('Loading...')
  })

  it('maps entries to the expected shape', () => {
    const entries: LeaderboardEntry[] = [
      { rank: 1, id: 1, canonicalName: 'Lysozyme', entityType: 'Protein', totalCitations: 500, recentCitations: 20, trend: 'up', trendDelta: 5 },
    ]
    const ctx = buildLeaderboardContext(entries) as Array<{ rank: number; name: string; type: string; totalCitations: number; trend: string }>
    expect(ctx[0]).toEqual({ rank: 1, name: 'Lysozyme', type: 'Protein', totalCitations: 500, trend: 'up' })
  })

  it('limits output to 20 entries', () => {
    const entries: LeaderboardEntry[] = Array.from({ length: 30 }, (_, i) => ({
      rank: i + 1, id: i + 1, canonicalName: `Entity${i}`, entityType: 'Protein',
      totalCitations: 100 - i, recentCitations: 5, trend: 'stable' as const, trendDelta: 0,
    }))
    const ctx = buildLeaderboardContext(entries) as unknown[]
    expect(ctx).toHaveLength(20)
  })
})
