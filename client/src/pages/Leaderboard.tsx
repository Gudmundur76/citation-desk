import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { api } from '@/lib/api'

export function Leaderboard() {
  const { data: entities, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.leaderboardTopEntities({ limit: 50 }),
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
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

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {entities && entities.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2.5rem_1fr_auto_auto_auto] gap-0 text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span>#</span>
              <span>Entity</span>
              <span className="text-right pr-6">Total</span>
              <span className="text-right pr-6">Recent</span>
              <span className="text-right">Trend</span>
            </div>

            {entities.map((e, i) => {
              const TrendIcon = e.trend === 'up' ? TrendingUp : e.trend === 'down' ? TrendingDown : Minus
              const trendColor = e.trend === 'up' ? 'text-emerald-500' : e.trend === 'down' ? 'text-red-400' : 'text-slate-300'

              return (
                <div
                  key={e.id}
                  className={`grid grid-cols-[2.5rem_1fr_auto_auto_auto] gap-0 px-4 py-3 items-center ${
                    i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  } hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0`}
                >
                  <span className="text-sm font-mono text-slate-400 font-medium">{e.rank}</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-900">{e.canonicalName}</span>
                    <span className="ml-2 text-xs text-slate-400 capitalize">{e.entityType}</span>
                  </div>
                  <span className="text-sm font-mono text-slate-700 text-right pr-6">{e.totalCitations}</span>
                  <span className="text-sm font-mono text-slate-500 text-right pr-6">{e.recentCitations}</span>
                  <div className={`flex items-center gap-0.5 justify-end ${trendColor}`}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    {e.trendDelta !== 0 && (
                      <span className="text-xs font-mono">{e.trendDelta > 0 ? '+' : ''}{e.trendDelta}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {entities && entities.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-sm">No leaderboard data yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
