import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Search as SearchIcon, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { ClaimCard } from '@/components/citation/ClaimCard'
import { domainLabel } from '@/lib/utils'

const VERDICTS = ['Supported', 'Refuted', 'Ambiguous', 'Insufficient Evidence']
const DOMAINS = ['structural_biology', 'salmon_biotech']

export function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(params.get('q') ?? '')
  const [verdict, setVerdict] = useState(params.get('verdict') ?? '')
  const [domain, setDomain] = useState(params.get('domain') ?? '')
  const [showFilters, setShowFilters] = useState(false)

  const q = params.get('q') ?? ''
  const filterVerdict = params.get('verdict') ?? undefined
  const filterDomain = params.get('domain') ?? undefined

  const prevQ = useRef('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', q, filterVerdict, filterDomain],
    queryFn: () => api.searchClaims(q, {
      verdict: filterVerdict,
      verticalDomain: filterDomain,
      limit: 50,
    }),
    enabled: q.length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (data && q && q !== prevQ.current) {
      prevQ.current = q
      if (data.count === 0) {
        toast.info(`No claims found for "${q}"`, {
          description: 'Try a different term or request an audit.',
          duration: 4000,
        })
      } else {
        toast.success(`${data.count} claim${data.count === 1 ? '' : 's'} found`, {
          description: `Showing results for "${q}"`,
          duration: 3000,
        })
      }
    }
  }, [data, q])

  useEffect(() => {
    setInput(params.get('q') ?? '')
    setVerdict(params.get('verdict') ?? '')
    setDomain(params.get('domain') ?? '')
  }, [params])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const p: Record<string, string> = {}
    if (input.trim().length >= 2) p.q = input.trim()
    if (verdict) p.verdict = verdict
    if (domain) p.domain = domain
    setParams(p)
  }

  function clearFilter(key: string) {
    const p = Object.fromEntries(params.entries())
    delete p[key]
    setParams(p)
  }

  const activeFilters = [
    filterVerdict && { key: 'verdict', label: filterVerdict },
    filterDomain && { key: 'domain', label: domainLabel(filterDomain) },
  ].filter(Boolean) as { key: string; label: string }[]

  return (
    <div className="min-h-screen bg-white">
      {/* Search header */}
      <div className="border-b border-slate-100 bg-slate-50 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search claims, proteins, methods, authors…"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400 text-slate-900"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                showFilters || activeFilters.length > 0
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilters.length > 0 && (
                <span className="bg-white text-slate-900 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                  {activeFilters.length}
                </span>
              )}
            </button>
            <button
              type="submit"
              disabled={input.trim().length < 2}
              className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Search
            </button>
          </form>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Verdict</label>
                <div className="flex flex-wrap gap-1.5">
                  {VERDICTS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVerdict(verdict === v ? '' : v)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        verdict === v
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Domain</label>
                <div className="flex flex-wrap gap-1.5">
                  {DOMAINS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDomain(domain === d ? '' : d)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        domain === d
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {domainLabel(d)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeFilters.map(f => (
                <button
                  key={f.key}
                  onClick={() => clearFilter(f.key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-full font-medium"
                >
                  {f.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {!q && (
          <div className="text-center py-20 text-slate-400">
            <SearchIcon className="w-10 h-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Enter a search term to find verified claims</p>
          </div>
        )}

        {q && isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {q && error && (
          <div className="text-center py-20 text-red-500">
            <p className="text-sm">Failed to load results. Please try again.</p>
          </div>
        )}

        {q && data && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-900">{data.count}</span> claims for{' '}
                <span className="font-semibold text-slate-900">"{q}"</span>
              </p>
            </div>

            {data.results.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-sm">No claims found for this query.</p>
                <button
                  onClick={() => navigate('/audit')}
                  className="mt-4 text-xs text-slate-500 underline hover:text-slate-700"
                >
                  Request an audit for this topic →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.results.map(claim => (
                  <ClaimCard key={claim.id} claim={claim} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
