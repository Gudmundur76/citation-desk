import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { Search as SearchIcon, X, ChevronDown, ChevronUp, Network } from 'lucide-react'
import { api } from '@/lib/api'
import type { CitationType } from '@/lib/api'
import { ClaimCard } from '@/components/citation/ClaimCard'
import { domainLabel } from '@/lib/utils'

const VERDICTS = ['Supported', 'Refuted', 'Ambiguous', 'Insufficient Evidence']
const DOMAINS = [
  'structural_biology',
  'salmon_biotech',
  'genomics',
  'clinical_trials',
  'nutrition',
  'food_safety',
  'economics_macro',
  'legal',
  'molecular_biology',
  'social_science',
  'energy',
  'earth_science',
]
const CITATION_TYPES: { value: CitationType; label: string; active: string }[] = [
  { value: 'VERIFIED',        label: 'Verified',        active: 'bg-emerald-700 text-white border-emerald-700' },
  { value: 'CONTESTED',       label: 'Contested',       active: 'bg-red-700 text-white border-red-700' },
  { value: 'IMPLIED',         label: 'Implied',         active: 'bg-amber-600 text-white border-amber-600' },
  { value: 'BEYOND_EVIDENCE', label: 'Beyond Evidence', active: 'bg-slate-600 text-white border-slate-600' },
]

function CooccurrenceSidebar() {
  const { data, isLoading } = useQuery({
    queryKey: ['cooccurrence-top'],
    queryFn: () => api.cooccurrenceTop({ limit: 12 }),
    staleTime: 5 * 60 * 1000,
  })

  const topNodes = useMemo(() => {
    if (!data?.nodes) return []
    return [...data.nodes].sort((a, b) => b.weight - a.weight).slice(0, 8)
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!topNodes.length) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Trending Entities
        </span>
      </div>
      <div className="space-y-1.5">
        {topNodes.map(node => (
          <a
            key={node.id}
            href={`/search?q=${encodeURIComponent(node.canonicalName)}`}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate group-hover:text-slate-900">
                {node.canonicalName}
              </p>
              <p className="text-xs text-slate-400 capitalize">{node.entityType.replace(/_/g, ' ')}</p>
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0 ml-2">
              {node.weight}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}

export function Search() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(params.get('q') ?? '')
  const [verdict, setVerdict] = useState(params.get('verdict') ?? '')
  const [domain, setDomain] = useState(params.get('domain') ?? '')
  const [citationType, setCitationType] = useState<CitationType | ''>(
    (params.get('citationType') as CitationType) ?? ''
  )
  const [minConf, setMinConf] = useState(Number(params.get('minConf') ?? 0))
  const [showFilters, setShowFilters] = useState(false)

  const q = params.get('q') ?? ''
  const filterVerdict = params.get('verdict') ?? undefined
  const filterDomain = params.get('domain') ?? undefined

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
    setInput(params.get('q') ?? '')
    setVerdict(params.get('verdict') ?? '')
    setDomain(params.get('domain') ?? '')
    setCitationType((params.get('citationType') as CitationType) ?? '')
    setMinConf(Number(params.get('minConf') ?? 0))
  }, [params])

  // Client-side filter for citation type and confidence
  const filteredResults = useMemo(() => {
    if (!data?.results) return []
    return data.results.filter(claim => {
      if (minConf > 0 && (claim.confidenceScore ?? 0) < minConf / 100) return false
      if (citationType) {
        const hasCitationType = claim.citations?.some(c => c.citationType === citationType)
        if (!hasCitationType) return false
      }
      return true
    })
  }, [data, citationType, minConf])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim().length < 2) return
    const p: Record<string, string> = { q: input.trim() }
    if (verdict) p.verdict = verdict
    if (domain) p.domain = domain
    if (citationType) p.citationType = citationType
    if (minConf > 0) p.minConf = String(minConf)
    setParams(p)
  }

  function clearFilter(key: string) {
    const p = Object.fromEntries(params.entries())
    delete p[key]
    if (key === 'verdict') setVerdict('')
    if (key === 'domain') setDomain('')
    if (key === 'citationType') setCitationType('')
    if (key === 'minConf') setMinConf(0)
    setParams(p)
  }

  const activeFilters = [
    filterVerdict && { key: 'verdict', label: filterVerdict },
    filterDomain && { key: 'domain', label: domainLabel(filterDomain) },
    citationType && { key: 'citationType', label: CITATION_TYPES.find(c => c.value === citationType)?.label ?? citationType },
    minConf > 0 && { key: 'minConf', label: `≥${minConf}% confidence` },
  ].filter(Boolean) as { key: string; label: string }[]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Search claims, proteins, methods, authors…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-lg font-medium transition-colors ${
                showFilters || activeFilters.length > 0
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              Filters
              {activeFilters.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-xs rounded-full bg-white text-slate-900 font-bold">
                  {activeFilters.length}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl space-y-4">
              <div className="flex flex-wrap gap-6">
                {/* Verdict */}
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

                {/* Domain */}
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

                {/* Citation type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Citation Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CITATION_TYPES.map(ct => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => setCitationType(citationType === ct.value ? '' : ct.value)}
                        className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                          citationType === ct.value
                            ? ct.active
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confidence range */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Min Confidence: <span className="text-slate-900 font-mono">{minConf > 0 ? `${minConf}%` : 'Any'}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={10}
                  value={minConf}
                  onChange={e => setMinConf(Number(e.target.value))}
                  className="w-48 accent-slate-900"
                />
                <div className="flex justify-between text-xs text-slate-400 w-48 mt-0.5">
                  <span>Any</span>
                  <span>90%+</span>
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

      {/* Body: results + sidebar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex gap-8">
        {/* Main results */}
        <div className="flex-1 min-w-0">
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
                  <span className="font-semibold text-slate-900">{filteredResults.length}</span>
                  {filteredResults.length !== data.count && (
                    <span className="text-slate-400"> of {data.count}</span>
                  )}
                  {' '}claims for{' '}
                  <span className="font-semibold text-slate-900">"{q}"</span>
                </p>
              </div>
              {filteredResults.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <p className="text-sm">No claims match the active filters.</p>
                  {activeFilters.length > 0 && (
                    <button
                      onClick={() => {
                        setVerdict(''); setDomain(''); setCitationType(''); setMinConf(0)
                        setParams({ q })
                      }}
                      className="mt-3 text-xs text-slate-500 underline hover:text-slate-700"
                    >
                      Clear all filters
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/audit')}
                    className="mt-4 block mx-auto text-xs text-slate-500 underline hover:text-slate-700"
                  >
                    Request an audit for this topic →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map(claim => (
                    <ClaimCard key={claim.id} claim={claim} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Entity co-occurrence sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 bg-white border border-slate-200 rounded-xl p-4">
            <CooccurrenceSidebar />
          </div>
        </aside>
      </div>
    </div>
  )
}
