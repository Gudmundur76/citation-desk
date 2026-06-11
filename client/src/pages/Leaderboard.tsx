/**
 * /leaderboard — Most-cited entities in the knowledge graph.
 *
 * Phase 118 enhancements:
 *   - Entity type filter tabs (All, Protein, Method, Organism, Author, Concept, Document)
 *   - Velocity indicator: 30-day vs 60-day citation delta
 *   - "Trending" section highlighting top movers
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { LeaderboardEntry } from '@/lib/api'

// ─── Entity type tabs ─────────────────────────────────────────────────────────

type EntityFilter = 'all' | 'protein' | 'method' | 'organism' | 'author' | 'concept' | 'document'

const TABS: { value: EntityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'protein', label: 'Proteins' },
  { value: 'method', label: 'Methods' },
  { value: 'organism', label: 'Organisms' },
  { value: 'author', label: 'Authors' },
  { value: 'concept', label: 'Concepts' },
  { value: 'document', label: 'Documents' },
]

// ─── Trending movers ──────────────────────────────────────────────────────────

function TrendingSection({ entries }: { entries: LeaderboardEntry[] }) {
  const movers = entries
    .filter((e) => e.trend === 'up' && e.trendDelta >= 2)
    .sort((a, b) => b.trendDelta - a.trendDelta)
    .slice(0, 5)

  if (movers.length === 0) return null

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-amber-900" style={{ fontFamily: 'Syne, sans-serif' }}>
          Trending (30-day movers)
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {movers.map((e) => (
          <span
            key={e.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium text-slate-700"
          >
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            {e.canonicalName}
            <span className="text-emerald-600 font-mono">+{e.trendDelta}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderboardRow({ e, i }: { e: LeaderboardEntry; i: number }) {
  const TrendIcon = e.trend === 'up' ? TrendingUp : e.trend === 'down' ? TrendingDown : Minus
  const trendColor =
    e.trend === 'up' ? 'text-emerald-500' : e.trend === 'down' ? 'text-red-400' : 'text-slate-300'

  // Velocity: recent (30d) vs total — show as percentage of total
  const velocity = e.totalCitations > 0
    ? Math.round((e.recentCitations / e.totalCitations) * 100)
    : 0

  return (
    <div
      className={cn(
        'grid grid-cols-[2.5rem_1fr_auto_auto_auto_auto] gap-0 px-4 py-3 items-center border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors',
        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
      )}
    >
      <span className="text-sm font-mono text-slate-400 font-medium">{e.rank}</span>

      <div>
        <span className="text-sm font-semibold text-slate-900">{e.canonicalName}</span>
        <span className="ml-2 text-xs text-slate-400 capitalize">{e.entityType}</span>
      </div>

      <span className="text-sm font-mono text-slate-700 text-right pr-6">{e.totalCitations}</span>

      <span className="text-sm font-mono text-slate-500 text-right pr-4">{e.recentCitations}</span>

      {/* Velocity bar */}
      <div className="w-12 pr-4 flex items-center justify-end">
        <div className="relative w-8 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-blue-400 rounded-full"
            style={{ width: `${Math.min(velocity, 100)}%` }}
          />
        </div>
      </div>

      <div className={cn('flex items-center gap-0.5 justify-end', trendColor)}>
        <TrendIcon className="w-3.5 h-3.5" />
        {e.trendDelta !== 0 && (
          <span className="text-xs font-mono">
            {e.trendDelta > 0 ? '+' : ''}
            {e.trendDelta}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Leaderboard() {
  const [activeFilter, setActiveFilter] = useState<EntityFilter>('all')

  const { data: entities, isLoading } = useQuery({
    queryKey: ['leaderboard', activeFilter],
    queryFn: () =>
      api.leaderboardTopEntities({
        limit: 50,
        ...(activeFilter !== 'all' ? { entityType: activeFilter } : {}),
      }),
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Entity Leaderboard
          </h1>
          <p className="text-sm text-slate-500">
            Most-cited proteins, enzymes, and biological entities across all verified documents.
          </p>
        </div>

        {/* Entity type filter tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                activeFilter === tab.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trending movers */}
        {entities && <TrendingSection entries={entities} />}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Results table */}
        {entities && entities.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2.5rem_1fr_auto_auto_auto_auto] gap-0 text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span>#</span>
              <span>Entity</span>
              <span className="text-right pr-6">Total</span>
              <span className="text-right pr-4">30d</span>
              <span className="text-right pr-4">Velocity</span>
              <span className="text-right">Trend</span>
            </div>

            {entities.map((e, i) => (
              <LeaderboardRow key={e.id} e={e} i={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {entities && entities.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-sm">No leaderboard data for this entity type yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
