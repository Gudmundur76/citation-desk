import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, SimilarClaim } from '@/lib/api'

const VERDICT_COLORS: Record<string, string> = {
  Supported: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Refuted: 'bg-red-100 text-red-800 border-red-200',
  Ambiguous: 'bg-amber-100 text-amber-800 border-amber-200',
  'Insufficient Evidence': 'bg-slate-100 text-slate-600 border-slate-200',
  'Out of Scope': 'bg-purple-100 text-purple-700 border-purple-200',
}

function VerdictPill({ verdict }: { verdict: string | null }) {
  if (!verdict) return null
  const cls = VERDICT_COLORS[verdict] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {verdict}
    </span>
  )
}

function SimilarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-mono tabular-nums shrink-0">{pct}%</span>
    </div>
  )
}

interface Props {
  claimId: number
  claimText: string
}

export function SimilarClaims({ claimId, claimText }: Props) {
  const [results, setResults] = useState<SimilarClaim[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .similarityFindSimilarToId(claimId, { topK: 5, threshold: 0.3 })
      .then((data) => {
        if (!cancelled) setResults(data)
      })
      .catch(() => {
        if (!cancelled) {
          // Fall back to text-based similarity if ID-based fails
          api
            .similarityFindSimilar(claimText.slice(0, 300), { topK: 5, threshold: 0.3 })
            .then((data) => {
              if (!cancelled) setResults(data.filter((r) => r.claimId !== claimId))
            })
            .catch((err) => {
              if (!cancelled) setError(err.message ?? 'Could not load similar claims')
            })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [claimId, claimText])

  if (loading) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Similar Claims
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    )
  }

  if (error || !results || results.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Similar Claims
        <span className="ml-2 text-xs font-normal normal-case text-slate-400">
          from the same knowledge graph
        </span>
      </h2>
      <div className="space-y-2">
        {results.map((r) => (
          <Link
            key={r.claimId}
            to={`/claims/${r.claimId}`}
            className="block p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 group"
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-sm text-slate-700 leading-snug line-clamp-2 group-hover:text-slate-900 transition-colors">
                {r.claimText}
              </p>
              <VerdictPill verdict={r.verdict} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 truncate flex-1">{r.documentTitle}</span>
              <SimilarityBar score={r.similarity} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
