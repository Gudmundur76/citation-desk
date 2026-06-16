import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { RefreshCw, CheckCircle, AlertCircle, HelpCircle, Minus, ArrowRight, Globe, Zap, GitBranch, Database } from 'lucide-react'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/utils'

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sublabel,
  dot,
}: {
  label: string
  value: number | string | undefined
  sublabel?: string
  dot?: string
}) {
  return (
    <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm">
      {dot && (
        <div className={`w-2 h-2 rounded-full ${dot} mb-4 animate-pulse`} />
      )}
      <div
        className="text-3xl font-bold text-slate-900 mb-1"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        {value !== undefined ? (typeof value === 'number' ? formatNumber(value) : value) : '—'}
      </div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
    </div>
  )
}

// ─── Verdict distribution bar ─────────────────────────────────────────────────

function VerdictBar({ stats }: { stats: { supportedVerdicts?: number; totalClaims?: number } | undefined }) {
  if (!stats || !stats.totalClaims || stats.totalClaims === 0) {
    return <div className="h-3 rounded-full bg-slate-100 animate-pulse" />
  }

  const total = stats.totalClaims
  const supported = stats.supportedVerdicts ?? 0
  const other = total - supported

  const pct = (n: number) => `${Math.round((n / total) * 100)}%`

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div className="bg-emerald-500 transition-all" style={{ width: pct(supported) }} title={`Supported: ${pct(supported)}`} />
        <div className="bg-slate-200 transition-all" style={{ width: pct(other) }} title={`Other verdicts: ${pct(other)}`} />
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Supported {pct(supported)}</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-200" />Other verdicts {pct(other)}</span>
      </div>
    </div>
  )
}

// ─── Recent claims feed ───────────────────────────────────────────────────────

const VERDICT_ICONS = {
  Supported: CheckCircle,
  Refuted: AlertCircle,
  Ambiguous: HelpCircle,
  'Insufficient Evidence': Minus,
  'Out of Scope': Minus,
}
const VERDICT_COLORS = {
  Supported: 'text-emerald-500',
  Refuted: 'text-red-500',
  Ambiguous: 'text-amber-500',
  'Insufficient Evidence': 'text-slate-400',
  'Out of Scope': 'text-slate-400',
}

function RecentFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['loopRecentClaims'],
    queryFn: () => api.registryClaims({ page: 1, page_size: 12 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="w-4 h-4 rounded-full bg-slate-200 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded w-full" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const claims = data?.claims ?? []

  return (
    <div className="space-y-3">
      {claims.map(c => {
        const Icon = VERDICT_ICONS[c.verdict as keyof typeof VERDICT_ICONS] ?? Minus
        const color = VERDICT_COLORS[c.verdict as keyof typeof VERDICT_COLORS] ?? 'text-slate-400'
        return (
          <Link
            key={c.id}
            to={`/claims/${c.claim_id}`}
            className="flex items-start gap-3 group hover:opacity-70 transition-opacity"
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
            <div className="min-w-0">
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-2 group-hover:text-slate-900 transition-colors">
                {c.claim_text}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{c.document_title}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Loop stages ─────────────────────────────────────────────────────────────

const LOOP_STAGES = [
  {
    icon: Globe,
    label: 'Ingest',
    desc: 'Papers fetched from PubMed Central OA, bioRxiv, and open-access repositories via OAI-PMH.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-100',
    dot: 'bg-blue-400',
  },
  {
    icon: Database,
    label: 'Extract',
    desc: 'LLM pipeline extracts discrete verifiable claims. Entity resolution against UniProt, PubChem, NCBI Taxonomy.',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-100',
    dot: 'bg-purple-400',
  },
  {
    icon: CheckCircle,
    label: 'Verdict',
    desc: 'Each claim receives Supported / Refuted / Ambiguous / Insufficient Evidence with confidence score and provenance.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-100',
    dot: 'bg-emerald-400',
  },
  {
    icon: GitBranch,
    label: 'Improve',
    desc: 'SIA Feedback-Agent rewrites extraction prompts based on quality signals. Loop accuracy compounds over time.',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-100',
    dot: 'bg-amber-400',
  },
  {
    icon: Zap,
    label: 'Ground',
    desc: 'Verdicts served via REST API. ClaimReview JSON-LD on every page. llms.txt for AI crawlers. OpenAPI spec.',
    color: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-100',
    dot: 'bg-pink-400',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Loop() {
  const { data: stats, dataUpdatedAt } = useQuery({
    queryKey: ['globalStats'],
    queryFn: api.globalStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: verticalStats } = useQuery({
    queryKey: ['verticalStats'],
    queryFn: () => api.verticalStats(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <div className="bg-white min-h-screen text-slate-900">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Self-improving loop — running 24/7
              </div>
              <h1
                className="text-4xl font-bold text-slate-900 mb-3"
                style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}
              >
                The Loop
              </h1>
              <p className="text-slate-500 max-w-xl leading-relaxed">
                citation.is ingests papers, extracts claims, assigns verdicts, and improves its own extraction pipeline autonomously — without human intervention. This page shows the loop running in real time.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-slate-400 font-mono">Updated {lastUpdated}</span>
              )}
              <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* ── Live stats grid ─────────────────────────────────────────── */}
        <section aria-labelledby="stats-heading">
          <h2
            id="stats-heading"
            className="text-lg font-bold text-slate-900 mb-6"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Live metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Verified Claims"
              value={stats?.totalClaims}
              sublabel="Total in registry"
              dot="bg-emerald-400"
            />
            <StatCard
              label="Source Documents"
              value={stats?.totalDocuments}
              sublabel="Papers processed"
              dot="bg-blue-400"
            />
            <StatCard
              label="Supported"
              value={stats?.supportedVerdicts}
              sublabel="Evidence-backed claims"
              dot="bg-emerald-300"
            />
            <StatCard
              label="Verticals"
              value={verticalStats?.length}
              sublabel="Active domains"
              dot="bg-purple-400"
            />
          </div>
        </section>

        {/* ── Verdict distribution ─────────────────────────────────────── */}
        <section aria-labelledby="verdict-heading">
          <h2
            id="verdict-heading"
            className="text-lg font-bold text-slate-900 mb-4"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Verdict distribution
          </h2>
          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm">
            <VerdictBar stats={stats} />
          </div>
        </section>

        {/* ── Loop stages ──────────────────────────────────────────────── */}
        <section aria-labelledby="stages-heading">
          <h2
            id="stages-heading"
            className="text-lg font-bold text-slate-900 mb-6"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Loop stages
          </h2>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-200 hidden sm:block" />
            <div className="space-y-4">
              {LOOP_STAGES.map(({ icon: Icon, label, desc, color, bg, dot }, i) => (
                <div key={label} className={`relative border rounded-2xl p-5 ${bg} sm:ml-12`}>
                  {/* Stage number on line */}
                  <div className="absolute -left-12 top-5 hidden sm:flex w-8 h-8 rounded-full bg-white border border-slate-200 items-center justify-center shadow-sm">
                    <span className="text-xs font-bold text-slate-400" style={{ fontFamily: 'DM Mono, monospace' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full ${dot} mt-1.5 shrink-0 animate-pulse`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${color}`} />
                        <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {label}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Verticals ────────────────────────────────────────────────── */}
        {verticalStats && verticalStats.length > 0 && (
          <section aria-labelledby="verticals-heading">
            <h2
              id="verticals-heading"
              className="text-lg font-bold text-slate-900 mb-6"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Active verticals
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {verticalStats.map(v => {
                const pct = v.totalClaims > 0
                  ? Math.round((v.supportedClaims / v.totalClaims) * 100)
                  : 0
                return (
                  <Link
                    key={v.domain}
                    to={`/verticals/${v.domain}`}
                    className="border border-slate-200 rounded-2xl p-5 bg-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm capitalize group-hover:text-emerald-600 transition-colors" style={{ fontFamily: 'Syne, sans-serif' }}>
                          {v.domain.replace(/-/g, ' ')}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{formatNumber(v.totalClaims)} claims</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600">{pct}% supported</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Recent claims feed ───────────────────────────────────────── */}
        <section aria-labelledby="feed-heading">
          <div className="flex items-center justify-between mb-6">
            <h2
              id="feed-heading"
              className="text-lg font-bold text-slate-900"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Recently verified claims
            </h2>
            <Link
              to="/registry"
              className="text-sm text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              Full registry <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm">
            <RecentFeed />
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="border border-slate-200 bg-slate-900 rounded-2xl p-10 text-center">
          <h2
            className="text-2xl font-bold text-white mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            The grounding layer is running.
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Every AI system that returns factual claims needs a verification layer. citation.is is that layer — domain-agnostic, continuously updated, and available via API today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/developers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
            >
              <Zap className="w-4 h-4" />
              Use the API
            </Link>
            <Link
              to="/registry"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
            >
              Browse Registry
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
