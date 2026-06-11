/**
 * EvidenceTimeline — shows how evidence for a claim has evolved across documents
 * over time. Uses tRPC timeline.forClaim to fetch cross-document verdict history.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { api } from '@/lib/api'
import { VerdictBadge } from './VerdictBadge'
import type { PublicVerdict } from '@/lib/api'

interface Props {
  claimText: string
  currentClaimId: number
}

export function EvidenceTimeline({ claimText, currentClaimId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', currentClaimId],
    queryFn: () => api.timelineForClaimText(claimText, 20),
    staleTime: 10 * 60_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="mb-6">
        <SectionHeading />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const events = data?.events ?? []
  // Only show if there are multiple documents (cross-document evidence)
  const uniqueDocs = new Set(events.map((e) => e.documentId))
  if (events.length === 0 || uniqueDocs.size < 2) return null

  return (
    <div className="mb-6">
      <SectionHeading count={events.length} />
      {data?.summary && (
        <p className="text-xs text-slate-500 mb-3">
          Across{' '}
          <span className="font-semibold text-slate-700">{uniqueDocs.size} documents</span>
          {data.summary.yearRange && (
            <>
              {' '}
              ({data.summary.yearRange[0]}–{data.summary.yearRange[1]})
            </>
          )}
          {data.summary.dominantVerdict && (
            <>
              {' '}· Dominant verdict:{' '}
              <span className="font-semibold text-slate-700">
                {data.summary.dominantVerdict}
              </span>
            </>
          )}
        </p>
      )}

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200" />

        <div className="space-y-3 pl-8">
          {events.map((ev, i) => (
            <div key={`${ev.claimId}-${i}`} className="relative">
              {/* Timeline dot */}
              <div
                className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  ev.verdict === 'Supported'
                    ? 'bg-emerald-400'
                    : ev.verdict === 'Refuted'
                      ? 'bg-red-400'
                      : ev.verdict === 'Ambiguous'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                }`}
              />

              <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <VerdictBadge verdict={ev.verdict as PublicVerdict} size="sm" />
                  {ev.publicationYear && (
                    <span className="text-xs text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {ev.publicationYear}
                    </span>
                  )}
                  {ev.confidenceScore !== null && (
                    <span className="text-xs font-mono text-slate-400 ml-auto">
                      {(ev.confidenceScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {ev.claimId === currentClaimId ? (
                    <span className="font-semibold text-slate-700">
                      {ev.documentTitle}
                    </span>
                  ) : (
                    <Link
                      to={`/claims/${ev.claimId}`}
                      className="hover:text-slate-800 underline underline-offset-2"
                    >
                      {ev.documentTitle}
                    </Link>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ count }: { count?: number }) {
  return (
    <h2
      className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide flex items-center gap-2"
      style={{ fontFamily: 'Syne, sans-serif' }}
    >
      Evidence Timeline
      {count !== undefined && (
        <span className="text-xs font-normal text-slate-400 normal-case tracking-normal">
          ({count} records)
        </span>
      )}
    </h2>
  )
}
