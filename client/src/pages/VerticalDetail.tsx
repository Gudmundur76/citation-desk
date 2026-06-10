import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/lib/api'
import { ClaimCard } from '@/components/citation/ClaimCard'
import { formatNumber, domainLabel } from '@/lib/utils'

export function VerticalDetail() {
  const { domain } = useParams<{ domain: string }>()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['verticalStats', domain],
    queryFn: () => api.verticalStats(),
    enabled: !!domain,
    staleTime: 60_000,
  })

  const { data: detail } = useQuery({
    queryKey: ['verticalDetail', domain],
    queryFn: () => api.verticalDetail(domain!),
    enabled: !!domain,
    staleTime: 60_000,
  })

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ['verticalSearch', domain, query],
    queryFn: () => api.searchClaims(query, { verticalDomain: domain, limit: 30 }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })

  const v = stats?.find(s => s.domain === domain) ?? stats?.[0]
  const pct = v && v.totalClaims > 0
    ? Math.round((v.supportedClaims / v.totalClaims) * 100)
    : 0

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/verticals')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All verticals
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {domainLabel(domain ?? '')}
          </h1>
          {detail?.description && (
            <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
              {detail.description}
            </p>
          )}
        </div>

        {/* Stats */}
        {v && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Documents', value: formatNumber(v.totalDocs) },
              { label: 'Claims', value: formatNumber(v.totalClaims) },
              { label: 'Supported', value: String(v.supportedClaims), color: 'text-emerald-600' },
              { label: 'Support rate', value: `${pct}%` },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4">
                <div
                  className={`text-2xl font-bold mb-0.5 ${color ?? 'text-slate-900'}`}
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {value}
                </div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search within vertical */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search claims in ${domainLabel(domain ?? '')}…`}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400 text-slate-900"
            />
          </div>
        </div>

        {/* Results */}
        {query.length >= 2 && searching && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {query.length >= 2 && searchData && (
          <div>
            <p className="text-xs text-slate-400 mb-3">
              {searchData.count} results for "{query}"
            </p>
            <div className="space-y-3">
              {searchData.results.map(claim => (
                <ClaimCard key={claim.id} claim={claim} showDocument />
              ))}
            </div>
          </div>
        )}

        {query.length < 2 && detail?.discoverySearchTerms && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Discovery search terms
            </h3>
            <div className="flex flex-wrap gap-2">
              {detail.discoverySearchTerms.slice(0, 8).map((term, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(term.split('[')[0].trim())}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-slate-400 hover:bg-white transition-colors font-mono"
                >
                  {term.split('[')[0].trim()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
