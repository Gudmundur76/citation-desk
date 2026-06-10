/**
 * Tests for the CitationCopilot readable context builder.
 *
 * The component itself is a React component that calls useCopilotReadable —
 * we test the pure data-transformation logic it uses, extracted as functions
 * so they can be validated without a DOM or CopilotKit runtime.
 */
import { describe, it, expect } from 'vitest'
import type {
  GlobalStats,
  VerticalStat,
  VerticalDetail,
  LeaderboardEntry,
} from '../client/src/lib/api'

// ─── Helpers mirrored from CitationCopilot.tsx ────────────────────────────────

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

// ─── globalStats context ──────────────────────────────────────────────────────

describe('buildGlobalStatsContext', () => {
  it('returns Loading... when stats are undefined', () => {
    expect(buildGlobalStatsContext(undefined)).toBe('Loading...')
  })

  it('returns the correct shape when stats are available', () => {
    const stats: GlobalStats = {
      totalDocuments: 47,
      totalClaims: 3962,
      supportedVerdicts: 2100,
      verifiedSources: 312,
    }
    const ctx = buildGlobalStatsContext(stats)
    expect(ctx).toEqual({
      totalDocuments: 47,
      totalClaims: 3962,
      supportedVerdicts: 2100,
      verifiedSources: 312,
    })
  })
})

// ─── vertical context ─────────────────────────────────────────────────────────

describe('buildVerticalContext', () => {
  const stats: VerticalStat[] = [
    {
      domain: 'structural_biology',
      totalDocs: 30,
      completedDocs: 28,
      totalClaims: 2000,
      supportedClaims: 1500,
    },
    {
      domain: 'salmon_biotech',
      totalDocs: 17,
      completedDocs: 17,
      totalClaims: 1962,
      supportedClaims: 600,
    },
  ]

  const details: VerticalDetail[] = [
    {
      domainKey: 'structural_biology',
      displayName: 'Structural Biology',
      description: 'Protein structures and crystallography.',
      discoverySearchTerms: ['protein', 'crystal'],
    },
  ]

  it('returns Loading... when either argument is undefined', () => {
    expect(buildVerticalContext(undefined, details)).toBe('Loading...')
    expect(buildVerticalContext(stats, undefined)).toBe('Loading...')
  })

  it('calculates supportRate correctly', () => {
    const ctx = buildVerticalContext(stats, details) as ReturnType<typeof buildVerticalContext>
    expect(ctx).not.toBe('Loading...')
    const rows = ctx as Array<{ domain: string; supportRate: string }>
    const sb = rows.find(r => r.domain === 'structural_biology')!
    expect(sb.supportRate).toBe('75%') // 1500/2000 = 75%
    const sal = rows.find(r => r.domain === 'salmon_biotech')!
    expect(sal.supportRate).toBe('31%') // 600/1962 ≈ 30.6% → 31%
  })

  it('falls back to domain key when no detail is found', () => {
    const ctx = buildVerticalContext(stats, details) as Array<{ domain: string; displayName: string }>
    const sal = ctx.find(r => r.domain === 'salmon_biotech')!
    expect(sal.displayName).toBe('salmon_biotech') // no detail entry
  })

  it('uses displayName from detail when available', () => {
    const ctx = buildVerticalContext(stats, details) as Array<{ domain: string; displayName: string }>
    const sb = ctx.find(r => r.domain === 'structural_biology')!
    expect(sb.displayName).toBe('Structural Biology')
  })

  it('returns 0% supportRate when totalClaims is 0', () => {
    const zeroStats: VerticalStat[] = [
      { domain: 'empty', totalDocs: 0, completedDocs: 0, totalClaims: 0, supportedClaims: 0 },
    ]
    const ctx = buildVerticalContext(zeroStats, []) as Array<{ supportRate: string }>
    expect(ctx[0].supportRate).toBe('0%')
  })
})

// ─── leaderboard context ──────────────────────────────────────────────────────

describe('buildLeaderboardContext', () => {
  it('returns Loading... when leaderboard is undefined', () => {
    expect(buildLeaderboardContext(undefined)).toBe('Loading...')
  })

  it('limits output to 20 entries', () => {
    const entries: LeaderboardEntry[] = Array.from({ length: 25 }, (_, i) => ({
      rank: i + 1,
      id: i + 1,
      canonicalName: `Entity ${i + 1}`,
      entityType: 'protein',
      totalCitations: 100 - i,
      recentCitations: 10,
      trend: 'stable' as const,
      trendDelta: 0,
    }))
    const ctx = buildLeaderboardContext(entries) as unknown[]
    expect(ctx).toHaveLength(20)
  })

  it('maps fields to the expected shape', () => {
    const entries: LeaderboardEntry[] = [
      {
        rank: 1,
        id: 42,
        canonicalName: 'Lysozyme',
        entityType: 'protein',
        totalCitations: 312,
        recentCitations: 18,
        trend: 'up',
        trendDelta: 3,
      },
    ]
    const ctx = buildLeaderboardContext(entries) as Array<{
      rank: number
      name: string
      type: string
      totalCitations: number
      trend: string
    }>
    expect(ctx[0]).toEqual({
      rank: 1,
      name: 'Lysozyme',
      type: 'protein',
      totalCitations: 312,
      trend: 'up',
    })
  })
})
