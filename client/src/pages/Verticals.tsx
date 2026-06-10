import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Database } from 'lucide-react'
import { api } from '@/lib/api'
import { formatNumber, domainLabel } from '@/lib/utils'

export function Verticals() {
  const navigate = useNavigate()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['verticalStats'],
    queryFn: () => api.verticalStats(),
    staleTime: 60_000,
  })

  const { data: details } = useQuery({
    queryKey: ['verticalListAll'],
    queryFn: api.verticalListAll,
    staleTime: 60_000,
  })

  const detailMap = Object.fromEntries((details ?? []).map(d => [d.domainKey, d]))

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Research Verticals
          </h1>
          <p className="text-slate-500 text-sm">
            Each vertical is a domain-specific claim verification engine backed by authoritative databases.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        <div className="space-y-4">
          {stats?.map(v => {
            const detail = detailMap[v.domain]
            const pct = v.totalClaims > 0
              ? Math.round((v.supportedClaims / v.totalClaims) * 100)
              : 0

            return (
              <button
                key={v.domain}
                onClick={() => navigate(`/verticals/${v.domain}`)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Database className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <h2
                        className="font-bold text-slate-900 text-lg leading-tight"
                        style={{ fontFamily: 'Syne, sans-serif' }}
                      >
                        {domainLabel(v.domain)}
                      </h2>
                      {detail?.description && (
                        <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                          {detail.description.slice(0, 160)}…
                        </p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {formatNumber(v.totalDocs)}
                    </div>
                    <div className="text-xs text-slate-400">Documents</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {formatNumber(v.totalClaims)}
                    </div>
                    <div className="text-xs text-slate-400">Claims</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {v.supportedClaims}
                    </div>
                    <div className="text-xs text-slate-400">Supported</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {pct}%
                    </div>
                    <div className="text-xs text-slate-400">Support rate</div>
                  </div>
                </div>

                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Upcoming */}
        <div className="mt-8 border border-dashed border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-slate-400 mb-1">More verticals in development</p>
          <p className="text-xs text-slate-300">Genomics · Clinical Trials · Nutrition Science · Pharmacology</p>
        </div>
      </div>
    </div>
  )
}
