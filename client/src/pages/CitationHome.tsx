import { useNavigate, Link } from 'react-router-dom'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, ArrowRight, CheckCircle, AlertCircle, HelpCircle, Minus,
  Zap, Globe, RefreshCw, Code2, ChevronRight, Shield, Database,
  X, ExternalLink, Loader2
} from 'lucide-react'
import { api, type CorpusGrowthStats } from '@/lib/api'
import { formatNumber, confidenceColor } from '@/lib/utils'

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

// ─── SSE stage types ──────────────────────────────────────────────────────────

type SearchStage = 'idle' | 'decompose' | 'evidence' | 'answer' | 'done' | 'error'

interface SearchSource {
  adapter: string
  title?: string
  journal?: string
  year?: number
  confidence?: number
  url?: string
}

interface SearchResult {
  query: string
  claim?: string
  answer?: string
  verdict?: string
  confidence?: number
  sources?: SearchSource[]
  adapterCount?: number
}

const VERDICT_PANEL: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Supported:             { bg: 'bg-emerald-950/60', border: 'border-emerald-700/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  Refuted:               { bg: 'bg-red-950/60',     border: 'border-red-700/50',     text: 'text-red-300',     dot: 'bg-red-400' },
  Ambiguous:             { bg: 'bg-amber-950/60',   border: 'border-amber-700/50',   text: 'text-amber-300',   dot: 'bg-amber-400' },
  'Insufficient Evidence':{ bg: 'bg-slate-800/60',  border: 'border-slate-600/50',   text: 'text-slate-300',   dot: 'bg-slate-400' },
}

const EXAMPLE_QUERIES = [
  'Does aspirin reduce cardiovascular risk?',
  'Is Akkermansia muciniphila beneficial for gut health?',
  'Does vitamin D supplementation prevent depression?',
]

// ─── HeroSearch Component ─────────────────────────────────────────────────────

function HeroSearch() {
  const [inputVal, setInputVal] = useState('')
  const [stage, setStage] = useState<SearchStage>('idle')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.()
    setStage('idle')
    setResult(null)
    setErrorMsg('')
  }, [])

  // Clean up on unmount
  useEffect(() => () => { abortRef.current?.() }, [])

  const runSearch = useCallback((q: string) => {
    if (!q.trim()) return
    abortRef.current?.()
    setStage('decompose')
    setResult(null)
    setErrorMsg('')

    let cancelled = false
    const es = new EventSource(`/api/citation-search/stream?q=${encodeURIComponent(q.trim())}`)
    abortRef.current = () => { cancelled = true; es.close() }

    es.addEventListener('stage:decompose', () => { if (!cancelled) setStage('decompose') })
    es.addEventListener('stage:evidence',  () => { if (!cancelled) setStage('evidence') })
    es.addEventListener('stage:answer',    () => { if (!cancelled) setStage('answer') })

    es.addEventListener('final', (e: MessageEvent) => {
      if (cancelled) return
      try {
        const data = JSON.parse(e.data) as SearchResult
        setResult(data)
        setStage('done')
      } catch {
        setErrorMsg('Unexpected response format')
        setStage('error')
      }
      es.close()
    })

    es.addEventListener('error', (e: MessageEvent) => {
      if (cancelled) return
      try {
        const data = JSON.parse(e.data) as { message?: string }
        setErrorMsg(data.message ?? 'Search failed')
      } catch {
        setErrorMsg('Search unavailable — please try again')
      }
      setStage('error')
      es.close()
    })

    // Native SSE error (network / 4xx / 5xx)
    es.onerror = () => {
      if (cancelled) return
      setErrorMsg('Could not reach the search service — please try again shortly')
      setStage('error')
      es.close()
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(inputVal)
  }

  // ── Idle state — static terminal demo with search bar ────────────────────
  if (stage === 'idle') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden font-mono text-sm shadow-lg">
        {/* Terminal bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-800">
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-amber-500/70" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-slate-400 text-xs">citation.is — live search</span>
        </div>
        {/* Static demo response */}
        <div className="px-5 py-4 border-b border-slate-700/40">
          <p className="text-slate-500 text-xs mb-2">// verified claim</p>
          <p className="text-slate-300"><span className="text-blue-400">{'{'}</span></p>
          <p className="text-slate-300 pl-4"><span className="text-emerald-400">"verdict"</span><span className="text-slate-500">: </span><span className="text-emerald-300">"Supported"</span><span className="text-slate-500">,</span></p>
          <p className="text-slate-300 pl-4"><span className="text-emerald-400">"confidence"</span><span className="text-slate-500">: </span><span className="text-amber-300">0.91</span><span className="text-slate-500">,</span></p>
          <p className="text-slate-300 pl-4"><span className="text-emerald-400">"evidence"</span><span className="text-slate-500">: [</span><span className="text-amber-300">"PMID:38291044"</span><span className="text-slate-500">, </span><span className="text-amber-300">"PMID:37104612"</span><span className="text-slate-500">]</span></p>
          <p className="text-slate-300"><span className="text-blue-400">{'}'}</span></p>
        </div>
        {/* Search bar */}
        <form onSubmit={handleSubmit} className="px-4 py-3">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={EXAMPLE_QUERIES[Math.floor(Date.now() / 10000) % EXAMPLE_QUERIES.length]}
              className="flex-1 bg-transparent text-slate-200 text-xs placeholder:text-slate-500 outline-none font-sans"
              aria-label="Search a scientific claim"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
            >
              Verify
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLE_QUERIES.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => { setInputVal(q); runSearch(q) }}
                className="text-slate-500 hover:text-emerald-400 text-[10px] font-sans transition-colors truncate max-w-[200px]"
              >
                ↗ {q}
              </button>
            ))}
          </div>
        </form>
      </div>
    )
  }

  // ── Active state — streaming progress + result ────────────────────────────
  const STAGES: { key: SearchStage; label: string }[] = [
    { key: 'decompose', label: 'Extracting claim' },
    { key: 'evidence',  label: 'Fetching evidence' },
    { key: 'answer',    label: 'Synthesising answer' },
  ]
  const stageIdx = STAGES.findIndex(s => s.key === stage)
  const panel = result?.verdict ? (VERDICT_PANEL[result.verdict] ?? VERDICT_PANEL['Insufficient Evidence']) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden font-mono text-sm shadow-lg">
      {/* Terminal bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-800">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-amber-500/70" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-slate-400 text-xs truncate flex-1">{inputVal || '...'}</span>
        <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors" aria-label="Clear search">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-4 max-h-[420px] overflow-y-auto">
        {/* Stage progress */}
        {stage !== 'done' && stage !== 'error' && (
          <div className="space-y-2">
            {STAGES.map((s, i) => {
              const isActive = s.key === stage
              const isDone = stageIdx > i
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className={`text-xs font-sans ${
                    isDone ? 'text-slate-400' : isActive ? 'text-slate-200' : 'text-slate-600'
                  }`}>{s.label}{isActive ? '...' : ''}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="text-red-400 text-xs font-sans">
            <AlertCircle className="inline w-3.5 h-3.5 mr-1" />
            {errorMsg}
          </div>
        )}

        {/* Result */}
        {stage === 'done' && result && panel && (
          <>
            {/* Verdict panel */}
            <div className={`rounded-xl border px-4 py-3 ${panel.bg} ${panel.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${panel.dot}`} />
                <span className={`text-xs font-semibold font-sans ${panel.text}`}>{result.verdict}</span>
                {result.confidence !== undefined && (
                  <span className="text-slate-500 text-xs font-sans ml-auto">{Math.round(result.confidence * 100)}% confidence</span>
                )}
              </div>
              {result.answer && (
                <p className="text-slate-300 text-xs font-sans leading-relaxed mt-1">{result.answer}</p>
              )}
            </div>

            {/* Source cards */}
            {result.sources && result.sources.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-slate-500 text-[10px] uppercase tracking-wider font-sans">Sources ({result.sources.length})</p>
                {result.sources.slice(0, 4).map((src, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                    <span className="text-slate-600 text-[10px] font-sans mt-0.5 shrink-0">{src.adapter}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-sans truncate">{src.title ?? '—'}</p>
                      {(src.journal || src.year) && (
                        <p className="text-slate-500 text-[10px] font-sans">{[src.journal, src.year].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* New search bar (always visible in active state) */}
        <form onSubmit={handleSubmit} className="pt-1">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 focus-within:border-emerald-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Ask another claim..."
              className="flex-1 bg-transparent text-slate-200 text-xs placeholder:text-slate-500 outline-none font-sans"
              aria-label="Search a scientific claim"
            />
            {stage !== 'done' && stage !== 'error' ? (
              <button type="button" onClick={reset} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-all">
                Cancel
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all active:scale-95"
              >
                Verify
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Featured Claims ──────────────────────────────────────────────────────────

function FeaturedClaims() {
  const { data, isLoading } = useQuery({
    queryKey: ['featuredClaims'],
    queryFn: () => api.registryClaims({ page: 1, page_size: 3, verdict: 'Supported' }),
    staleTime: 300_000,
  })

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="border border-slate-200 rounded-xl p-5 animate-pulse space-y-3 bg-slate-50">
            <div className="h-3 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  const claims = data?.claims?.slice(0, 3) ?? []
  if (claims.length === 0) return null

  const VERDICT_BG: Record<string, string> = {
    Supported: 'bg-emerald-50 border-emerald-200',
    Refuted: 'bg-red-50 border-red-200',
    Ambiguous: 'bg-amber-50 border-amber-200',
    'Insufficient Evidence': 'bg-slate-50 border-slate-200',
    'Out of Scope': 'bg-slate-50 border-slate-200',
  }
  const VERDICT_TEXT: Record<string, string> = {
    Supported: 'text-emerald-700',
    Refuted: 'text-red-700',
    Ambiguous: 'text-amber-700',
    'Insufficient Evidence': 'text-slate-500',
    'Out of Scope': 'text-slate-500',
  }

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {claims.map(claim => {
        const bg = VERDICT_BG[claim.verdict] ?? 'bg-slate-50 border-slate-200'
        const tc = VERDICT_TEXT[claim.verdict] ?? 'text-slate-500'
        const conf = claim.confidence_score
        const confPct = conf !== null ? Math.round(conf * 100) : null
        const confCls = conf !== null ? confidenceColor(conf) : 'text-slate-400'
        return (
          <Link
            key={claim.id}
            to={`/claims/${claim.claim_id}`}
            className={`block border rounded-xl p-5 hover:shadow-md transition-all group ${bg}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wide ${tc}`}>
                {claim.verdict}
              </span>
              {confPct !== null && (
                <span className={`text-xs font-mono font-semibold ${confCls}`}>
                  {confPct}%
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-3 mb-4">
              {claim.claim_text}
            </p>
            <p className="text-xs text-slate-400 truncate">{claim.document_title}</p>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Main Home ────────────────────────────────────────────────────────────────

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['globalStats'],
    queryFn: api.globalStats,
    staleTime: 60_000,
  })

  const { data: recentClaimsData } = useQuery({
    queryKey: ['recentClaims'],
    queryFn: () => api.registryClaims({ page: 1, page_size: 10 }),
    staleTime: 120_000,
  })

  // Sprint 20: live corpus growth for loop animation cards
  const { data: growth } = useQuery<CorpusGrowthStats>({
    queryKey: ['corpusGrowth'],
    queryFn: api.corpusGrowth,
    staleTime: 60_000,
    retry: false,
  })
  const recentClaims = recentClaimsData?.claims ?? []
  const liveTotal = recentClaimsData?.total

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="bg-white text-slate-900 min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100" aria-labelledby="hero-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-700 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Universal AI Grounding Layer — live
              </div>

              <h1
                id="hero-heading"
                className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 leading-[1.05]"
                style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}
              >
                Ground every<br />
                AI claim in<br />
                <span className="text-emerald-600">verified truth.</span>
              </h1>

              <p className="text-lg text-slate-500 leading-relaxed mb-8 max-w-lg">
                citation.is is the verification primitive for AI agents. Send any claim — receive a structured verdict, confidence score, evidence provenance, and contradiction flags. Infrastructure, not a product. Like CrossRef for DOIs, but for scientific claims.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  to="/developers"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
                >
                  <Code2 className="w-4 h-4" />
                  API Docs
                </Link>
                <Link
                  to="/loop"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Live Loop
                </Link>
                <Link
                  to="/registry"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
                >
                  Browse Registry
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-8">
                {[
                  { label: 'Verified Claims', value: liveTotal ?? stats?.totalClaims },
                  { label: 'Source Documents', value: stats?.totalDocuments },
                  { label: 'Supported Claims', value: stats?.supportedVerdicts },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div
                      className="text-2xl font-bold text-slate-900"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {value !== undefined ? formatNumber(value) : '—'}
                    </div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Live search */}
            <div>
              <HeroSearch />
            </div>
          </div>
        </div>
      </section>

      {/* ── Live ticker ──────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50 py-3 overflow-hidden" aria-label="Recently verified claims">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Live
            </span>
            {recentClaims.length > 0
              ? recentClaims.map(c => {
                  const Icon = VERDICT_ICONS[c.verdict as keyof typeof VERDICT_ICONS] ?? Minus
                  const color = VERDICT_COLORS[c.verdict as keyof typeof VERDICT_COLORS] ?? 'text-slate-400'
                  return (
                    <Link
                      key={c.id}
                      to={`/claims/${c.claim_id}`}
                      className="flex items-center gap-2 shrink-0 hover:opacity-70 transition-opacity"
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                      <span className="text-xs text-slate-500 max-w-xs truncate">{c.claim_text}</span>
                    </Link>
                  )
                })
              : [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0 animate-pulse">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                    <div className="h-3 bg-slate-200 rounded w-48" />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-b border-slate-100" aria-labelledby="how-heading">
        <div className="text-center mb-14">
          <h2
            id="how-heading"
            className="text-3xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}
          >
            The universal grounding layer
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Any AI system can call citation.is before returning a factual claim. The verdict is structured, machine-readable, and traceable to source.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              icon: Globe,
              title: 'Ingest',
              desc: 'Papers fetched continuously from PubMed Central, bioRxiv, and open-access repositories. Corpus grows autonomously.',
              color: 'text-blue-600',
              bg: 'bg-blue-50 border-blue-100',
            },
            {
              step: '02',
              icon: Search,
              title: 'Extract',
              desc: 'LLM pipeline extracts discrete, verifiable claims from each document. Entity resolution against UniProt, PubChem, NCBI.',
              color: 'text-purple-600',
              bg: 'bg-purple-50 border-purple-100',
            },
            {
              step: '03',
              icon: CheckCircle,
              title: 'Verdict',
              desc: 'Each claim receives one of seven verdicts: Supported, Partially Supported, Ambiguous, Contradicted, Insufficient Evidence, Out of Scope, or Needs Expert Review — with confidence score and provenance chain.',
              color: 'text-emerald-600',
              bg: 'bg-emerald-50 border-emerald-100',
            },
            {
              step: '04',
              icon: Zap,
              title: 'Ground',
              desc: 'Any AI system calls the API. Structured JSON response in <100ms. ClaimReview schema. OpenAPI spec. llms.txt.',
              color: 'text-amber-600',
              bg: 'bg-amber-50 border-amber-100',
            },
          ].map(({ step, icon: Icon, title, desc, color, bg }) => (
            <div key={step} className={`border rounded-2xl p-6 ${bg}`}>
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-5 h-5 ${color}`} />
                <span
                  className="text-2xl font-bold text-slate-200"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                >
                  {step}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
                {title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Self-improving loop ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-b border-slate-100" aria-labelledby="loop-heading">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-500 mb-6">
              <RefreshCw className="w-3 h-3 text-emerald-500" />
              Self-improving loop — running 24/7
            </div>
            <h2
              id="loop-heading"
              className="text-3xl font-bold text-slate-900 mb-4"
              style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}
            >
              The loop runs.<br />The graph compounds.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6">
              citation.is is not a static database. The extraction pipeline runs continuously, ingesting new papers, improving its own prompts through structured feedback loops, and densifying the knowledge graph autonomously — without human intervention.
            </p>
            <p className="text-slate-500 leading-relaxed mb-8">
              Every iteration makes the verdicts more accurate. Every new paper makes the graph more complete. The asset compounds over time.
            </p>
            <Link
              to="/loop"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-semibold transition-colors"
            >
              Watch the loop run live
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Loop diagram — Sprint 20: wired to live corpus-growth endpoint */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Papers Queued',
                sublabel: 'PubMed Central OA',
                value: growth?.papersQueued,
                valueSuffix: ' today',
                color: 'border-blue-100 bg-blue-50',
                dot: 'bg-blue-400',
              },
              {
                label: 'Claims Extracted',
                sublabel: 'LLM pipeline',
                value: growth?.claimsExtracted,
                valueSuffix: ' today',
                color: 'border-purple-100 bg-purple-50',
                dot: 'bg-purple-400',
              },
              {
                label: 'Verdicts Assigned',
                sublabel: 'Evidence grounded',
                value: growth?.verdictsAssigned,
                valueSuffix: ' today',
                color: 'border-emerald-100 bg-emerald-50',
                dot: 'bg-emerald-400',
              },
              {
                label: 'Graph Nodes',
                sublabel: 'Knowledge graph',
                value: growth?.graphNodes,
                valueSuffix: ' total',
                color: 'border-amber-100 bg-amber-50',
                dot: 'bg-amber-400',
              },
            ].map(({ label, sublabel, value, valueSuffix, color, dot }) => (
              <div key={label} className={`border rounded-xl p-5 ${color}`}>
                <div className={`w-2 h-2 rounded-full ${dot} mb-3 animate-pulse`} />
                {value !== undefined && (
                  <p className="text-xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'DM Mono, monospace' }}>
                    {formatNumber(value)}
                    <span className="text-xs font-normal text-slate-400 ml-1">{valueSuffix}</span>
                  </p>
                )}
                <p className="font-semibold text-slate-800 text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured claims ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-b border-slate-100" aria-labelledby="claims-heading">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              id="claims-heading"
              className="text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Recently verified claims
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Live from the registry — updated continuously.
            </p>
          </div>
          <Link
            to="/registry"
            className="text-sm font-medium text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            Browse all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <FeaturedClaims />
      </section>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 border-b border-slate-100" aria-labelledby="search-heading">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            id="search-heading"
            className="text-2xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Search{' '}
            {liveTotal ? (
              <span className="text-emerald-600">{formatNumber(liveTotal)}+</span>
            ) : 'verified'}{' '}
            claims
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            Proteins, compounds, organisms, methods — every claim cross-referenced against authoritative databases.
          </p>
          <form onSubmit={handleSearch}>
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search claims, proteins, methods…"
                className="w-full pl-11 pr-32 py-3.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-300 text-slate-700 shadow-sm"
              />
              <button
                type="submit"
                disabled={query.trim().length < 2}
                className="absolute right-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 active:scale-[0.97]"
              >
                Search
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── For AI builders ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20" aria-labelledby="builders-heading">
        <div className="text-center mb-14">
          <h2
            id="builders-heading"
            className="text-3xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.02em' }}
          >
            Built for AI systems
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            citation.is is infrastructure, not a product. It sits under your AI system and returns structured verdicts any model can consume.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Code2,
              title: 'MCP Server',
              desc: 'Native Model Context Protocol server at citation.is/mcp. Connect any MCP-compatible agent — Claude, Genspark, Cursor — and verify claims in one tool call.',
              link: '/developers',
              linkLabel: 'Connect via MCP',
            },
            {
              icon: Database,
              title: 'REST API',
              desc: 'POST a claim, receive a structured JSON verdict with confidence, evidence PMIDs, and contradiction count. OpenAPI spec included. 60 req/min free.',
              link: '/developers',
              linkLabel: 'View API docs',
            },
            {
              icon: Shield,
              title: 'ClaimReview Schema',
              desc: 'Every claim page embeds ClaimReview JSON-LD — the standard schema for fact-check results, readable by Google, Bing, and AI search engines.',
              link: '/methodology',
              linkLabel: 'Methodology',
            },
          ].map(({ icon: Icon, title, desc, link, linkLabel }) => (
            <div key={title} className="border border-slate-200 rounded-2xl p-6 bg-white hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
                {title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">{desc}</p>
              <Link
                to={link}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="border border-slate-200 bg-slate-900 rounded-2xl p-10 text-center">
          <h3
            className="text-2xl font-bold text-white mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            The grounding layer your AI needs.
          </h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Every AI system that returns factual claims needs a verification primitive. citation.is is that primitive — domain-agnostic, MCP-native, continuously updated, and available via API today.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/developers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
            >
              <Code2 className="w-4 h-4" />
              Start with the API
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition-all active:scale-[0.97]"
            >
              Get in touch
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
