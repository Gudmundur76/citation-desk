import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { Search, ArrowRight, CheckCircle, AlertCircle, HelpCircle, Minus } from 'lucide-react'
import { api } from '@/lib/api'
import { formatNumber, domainLabel } from '@/lib/utils'

const VERDICT_ICONS = {
  Supported: CheckCircle,
  Refuted: AlertCircle,
  Ambiguous: HelpCircle,
  'Insufficient Evidence': Minus,
  'Out of Scope': Minus,
}

const VERDICT_COLORS = {
  Supported: 'text-emerald-600',
  Refuted: 'text-red-500',
  Ambiguous: 'text-amber-500',
  'Insufficient Evidence': 'text-slate-400',
  'Out of Scope': 'text-slate-400',
}

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['globalStats'],
    queryFn: api.globalStats,
    staleTime: 60_000,
  })

  const { data: verticalStats } = useQuery({
    queryKey: ['verticalStats'],
    queryFn: () => api.verticalStats(),
    staleTime: 60_000,
  })

  // Live recently verified claims from the public registry
  const { data: recentClaimsData } = useQuery({
    queryKey: ['recentClaims'],
    queryFn: () => api.registryClaims({ page: 1, page_size: 8 }),
    staleTime: 120_000,
  })
  const recentClaims = recentClaimsData?.claims ?? []

  // Live total from the public registry (most accurate count)
  const liveTotal = recentClaimsData?.total

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100" aria-labelledby="hero-heading">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(oklch(0.12 0.01 250) 1px, transparent 1px), linear-gradient(90deg, oklch(0.12 0.01 250) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Scientific claim verification — live
          </div>

          {/* Headline */}
          <h1
            id="hero-heading"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-[1.05]"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}
          >
            Every claim,<br />
            <span className="text-slate-400">verified.</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Search{' '}
            {liveTotal ? (
              <span className="font-semibold text-slate-700">{formatNumber(liveTotal)}+</span>
            ) : (
              '3,900+'
            )}{' '}
            verified scientific claims from structural biology, salmon biotech, and more — each
            cross-referenced against authoritative databases.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search claims, proteins, methods…"
                className="w-full pl-11 pr-32 py-3.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400 text-slate-900"
              />
              <button
                type="submit"
                disabled={query.trim().length < 2}
                className="absolute right-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                Search
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Live stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Documents', value: stats?.totalDocuments },
              { label: 'Claims', value: liveTotal ?? stats?.totalClaims },
              { label: 'Supported', value: stats?.supportedVerdicts },
              { label: 'Sources', value: stats?.verifiedSources },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4 text-center">
                <div
                  className="text-2xl font-bold text-slate-900 mb-0.5"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {value !== undefined ? formatNumber(value) : '—'}
                </div>
                <div className="text-xs text-slate-500 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently verified claims ticker — live from API */}
      <section className="border-b border-slate-100 bg-slate-50 py-4 overflow-hidden" aria-label="Recently verified claims">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none pb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Recent
            </span>
            {recentClaims.length > 0
              ? recentClaims.map(c => {
                  const Icon = VERDICT_ICONS[c.verdict as keyof typeof VERDICT_ICONS] ?? Minus
                  const color = VERDICT_COLORS[c.verdict as keyof typeof VERDICT_COLORS] ?? 'text-slate-400'
                  return (
                    <Link
                      key={c.id}
                      to={`/claims/${c.claim_id}`}
                      className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                      <span className="text-xs text-slate-600 max-w-xs truncate">{c.claim_text}</span>
                    </Link>
                  )
                })
              : // Skeleton placeholders while loading
                [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0 animate-pulse">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    <div className="h-3 bg-slate-200 rounded w-48" />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Verticals */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16" aria-labelledby="verticals-heading">
          <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              id="verticals-heading"
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Research Verticals
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Domain-specific claim verification engines
            </p>
          </div>
          <button
            onClick={() => navigate('/verticals')}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {verticalStats?.map(v => {
            const pct = v.totalClaims > 0
              ? Math.round((v.supportedClaims / v.totalClaims) * 100)
              : 0
            return (
              <button
                key={v.domain}
                onClick={() => navigate(`/verticals/${v.domain}`)}
                className="text-left bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3
                      className="font-bold text-slate-900 text-base group-hover:text-slate-700 transition-colors"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {domainLabel(v.domain)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {v.completedDocs}/{v.totalDocs} documents processed
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-0.5" />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <div className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {formatNumber(v.totalClaims)}
                    </div>
                    <div className="text-xs text-slate-400">Claims</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-600" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {v.supportedClaims}
                    </div>
                    <div className="text-xs text-slate-400">Supported</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {pct}%
                    </div>
                    <div className="text-xs text-slate-400">Support rate</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            )
          })}

          {/* Placeholder for upcoming verticals */}
          {(!verticalStats || verticalStats.length < 4) && (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-2">
              <div className="text-slate-300 text-2xl">+</div>
              <p className="text-sm text-slate-400 font-medium">More verticals coming</p>
              <p className="text-xs text-slate-300">Genomics, Clinical Trials, Nutrition</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-900 py-16" aria-labelledby="cta-heading">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2
            id="cta-heading"
            className="text-3xl font-bold text-white mb-4"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Need a document audited?
          </h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Submit a research paper, pitch deck, or whitepaper for full claim extraction
            and evidence-backed verification.
          </p>
          <button
            onClick={() => navigate('/audit')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors"
          >
            Request an Audit
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Citability: hidden descriptive paragraph for agent crawlers */}
      <div className="sr-only" aria-hidden="false">
        <p>
          citation.is is an open registry of verified scientific claims. Each claim is extracted
          from peer-reviewed literature, assigned a verdict (Supported, Refuted, Inconclusive,
          or Needs Context), and cross-referenced against UniProt, PubChem, NCBI Taxonomy, and
          PubMed. The registry contains over 3,900 verified claims across domains including
          structural biology, salmon aquaculture, and biotech. All data is published under
          CC BY 4.0 and accessible via REST API, MCP, OAI-PMH, and bulk download.
        </p>
      </div>
    </div>
  )
}
