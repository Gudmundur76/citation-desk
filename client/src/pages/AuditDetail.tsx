/**
 * /audit/:id — Audit report detail page.
 *
 * Fetches the full audit report for a document from the ttruthdesk.claims
 * public API and renders all verified claims from that document, grouped
 * by verdict. Links back to the registry and to the source document.
 *
 * Data source: GET /api/external/public/claims?document_id=:id
 */
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  BarChart2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { VerdictBadge } from '@/components/citation/VerdictBadge'
import { domainLabel, confidenceColor, confidenceLabel, formatNumber } from '@/lib/utils'
import type { PublicClaim } from '@/lib/api'

function VerdictIcon({ verdict, className }: { verdict: string; className?: string }) {
  const cls = className ?? 'w-4 h-4'
  switch (verdict) {
    case 'Supported': return <CheckCircle2 className={`${cls} text-emerald-500`} />
    case 'Refuted': return <XCircle className={`${cls} text-red-500`} />
    case 'Ambiguous': return <AlertCircle className={`${cls} text-amber-500`} />
    default: return <HelpCircle className={`${cls} text-slate-400`} />
  }
}

function VerdictBar({ claims }: { claims: PublicClaim[] }) {
  const total = claims.length
  if (total === 0) return null
  const counts = {
    Supported: claims.filter(c => c.verdict === 'Supported').length,
    Refuted: claims.filter(c => c.verdict === 'Refuted').length,
    Ambiguous: claims.filter(c => c.verdict === 'Ambiguous').length,
    'Insufficient Evidence': claims.filter(c =>
      c.verdict === 'Insufficient Evidence' || c.verdict === 'Out of Scope'
    ).length,
  }
  return (
    <div className="space-y-3">
      {Object.entries(counts).map(([verdict, count]) => {
        if (count === 0) return null
        const pct = Math.round((count / total) * 100)
        const colors: Record<string, string> = {
          Supported: 'bg-emerald-500',
          Refuted: 'bg-red-500',
          Ambiguous: 'bg-amber-400',
          'Insufficient Evidence': 'bg-slate-300',
        }
        return (
          <div key={verdict} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-36 shrink-0">{verdict}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colors[verdict] ?? 'bg-slate-300'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700 w-12 text-right shrink-0">
              {count} <span className="text-slate-400 font-normal">({pct}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function AuditDetail() {
  const { id } = useParams<{ id: string }>()
  const documentId = Number(id)

  const { data, isLoading, error } = useQuery({
    queryKey: ['auditDetail', documentId],
    queryFn: () => api.registryClaims({ page: 1, page_size: 200 }),
    enabled: !isNaN(documentId),
    staleTime: 60_000,
  })

  // Filter claims for this document
  const claims = data?.claims.filter(c => c.document_id === documentId) ?? []
  const documentTitle = claims[0]?.document_title ?? `Document #${documentId}`
  const verticalDomain = claims[0]?.vertical_domain ?? null

  if (isNaN(documentId)) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-slate-500 text-sm">Invalid audit ID.</p>
        <Link to="/registry" className="text-slate-900 font-medium text-sm underline mt-4 inline-block">
          ← Back to Registry
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-8 bg-slate-100 rounded w-2/3" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-50 rounded-xl border border-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error || claims.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          Audit report not found
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          No verified claims found for document #{documentId}.
        </p>
        <Link
          to="/registry"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Registry
        </Link>
      </div>
    )
  }

  const auditUrl = `https://ttruthdesk.claims/audit/${documentId}`

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        to="/registry"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Registry
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Audit Report</span>
          <span className="text-slate-200">·</span>
          <span className="text-xs text-slate-400">#{documentId}</span>
          {verticalDomain && (
            <>
              <span className="text-slate-200">·</span>
              <span className="text-xs text-slate-500">{domainLabel(verticalDomain)}</span>
            </>
          )}
        </div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          {documentTitle}
        </h1>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <BarChart2 className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-900">{formatNumber(claims.length)}</span>
            <span>claims verified</span>
          </div>
          <a
            href={auditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            View on Truth Desk
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Verdict distribution bar */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Verdict Distribution
          </h2>
          <VerdictBar claims={claims} />
        </div>
      </div>

      {/* Claims list */}
      <div className="space-y-3">
        {claims.map(claim => (
          <Link
            key={claim.id}
            to={`/claims/${claim.claim_id}`}
            className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <VerdictIcon verdict={claim.verdict} className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 leading-relaxed mb-2 group-hover:text-slate-900 transition-colors">
                  {claim.claim_text}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={claim.verdict} />
                  {claim.confidence_score !== null && (
                    <span className={`text-xs font-medium ${confidenceColor(claim.confidence_score)}`}>
                      {confidenceLabel(claim.confidence_score)} confidence
                    </span>
                  )}
                  {claim.claim_type && (
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      {claim.claim_type.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-10 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">
          Verified by the{' '}
          <a
            href="https://ttruthdesk.claims"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            Protein Truth Desk
          </a>{' '}
          pipeline · citation.is
        </p>
      </div>
    </div>
  )
}
