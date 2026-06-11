/**
 * CitationsPanel — shows the passage-level citations for a claim.
 * Each citation has a type (VERIFIED / CONTESTED / IMPLIED / BEYOND_EVIDENCE),
 * the exact passage from the source document, and a confidence score.
 *
 * Data source: tRPC citations.forClaim (Phase 96 citation layer)
 */
import { useQuery } from '@tanstack/react-query'
import { Quote } from 'lucide-react'
import { api } from '@/lib/api'
import { CitationTypeBadge } from './CitationTypeBadge'

interface Props {
  claimId: number
}

export function CitationsPanel({ claimId }: Props) {
  const { data: citations, isLoading } = useQuery({
    queryKey: ['citations', claimId],
    queryFn: () => api.citationsForClaim(claimId),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="mb-6">
        <SectionHeading />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!citations || citations.length === 0) return null

  return (
    <div className="mb-6">
      <SectionHeading count={citations.length} />
      <div className="space-y-3">
        {citations.map((c) => (
          <div
            key={c.id}
            className="border border-slate-200 rounded-xl p-4 bg-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <CitationTypeBadge type={c.citationType} />
              <span className="text-xs text-slate-400 font-mono ml-auto">
                {(c.citationConfidence * 100).toFixed(0)}% confidence
              </span>
            </div>

            {c.passageText && (
              <blockquote className="border-l-2 border-slate-200 pl-3 mt-1">
                <div className="flex gap-1.5">
                  <Quote className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    {c.passageText}
                  </p>
                </div>
              </blockquote>
            )}

            {c.evidenceBoundary && (
              <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
                <span className="font-semibold">Evidence boundary:</span>{' '}
                {c.evidenceBoundary}
              </p>
            )}
          </div>
        ))}
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
      Source Citations
      {count !== undefined && (
        <span className="text-xs font-normal text-slate-400 normal-case tracking-normal">
          ({count})
        </span>
      )}
    </h2>
  )
}
