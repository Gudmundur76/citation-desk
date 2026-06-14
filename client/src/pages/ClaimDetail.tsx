/**
 * /claims/:id — Full claim detail page.
 *
 * Renders the complete verification record for a single claim:
 *   - Verdict badge + confidence score
 *   - Claim text (full, untruncated)
 *   - Verdict rationale
 *   - Evidence URL (primary source)
 *   - Document provenance
 *   - Claim type + extracted value
 *   - ClaimReview JSON-LD injected into <head> for SEO
 *   - Link back to the registry and to the audit on citation.is
 *
 * Data source: GET /api/external/public/claims/:id (public REST API, proxied server-side)
 */
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  MinusCircle,
  Calendar,
  FileText,
  Tag,
  Dna,
  Download,
  Code2,
  Copy,
  Check,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState as useLocalState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, rewriteUrl } from '@/lib/api'
import { VerdictBadge } from '@/components/citation/VerdictBadge'
import { CitationsPanel } from '@/components/citation/CitationsPanel'
import { ConfidenceSparkline } from '@/components/citation/ConfidenceSparkline'
import { EvidenceTimeline } from '@/components/citation/EvidenceTimeline'
import { ProvenanceAuditTrail } from '@/components/citation/ProvenanceAuditTrail'
import { SimilarClaims } from '@/components/citation/SimilarClaims'
import { domainLabel, confidenceColor, confidenceLabel } from '@/lib/utils'
import type { PublicClaimDetail, ClaimScoreHistoryResponse } from '@/lib/api'

// ─── Verdict icon map ─────────────────────────────────────────────────────────

function VerdictIcon({ verdict, className }: { verdict: string; className?: string }) {
  const cls = className ?? 'w-5 h-5'
  switch (verdict) {
    case 'Supported':
      return <CheckCircle2 className={`${cls} text-emerald-500`} />
    case 'Refuted':
      return <XCircle className={`${cls} text-red-500`} />
    case 'Ambiguous':
      return <AlertCircle className={`${cls} text-amber-500`} />
    case 'Out of Scope':
      return <MinusCircle className={`${cls} text-slate-400`} />
    default:
      return <HelpCircle className={`${cls} text-slate-400`} />
  }
}

// ─── Verdict → schema.org rating mapping ─────────────────────────────────────

function verdictToRating(verdict: string) {
  switch (verdict) {
    case 'Supported':   return { ratingValue: 5, bestRating: 5, worstRating: 1, alternateName: 'True' }
    case 'Refuted':     return { ratingValue: 1, bestRating: 5, worstRating: 1, alternateName: 'False' }
    case 'Ambiguous':   return { ratingValue: 3, bestRating: 5, worstRating: 1, alternateName: 'Mixture' }
    default:            return { ratingValue: 2, bestRating: 5, worstRating: 1, alternateName: 'Unverified' }
  }
}

// ─── JSON-LD injector ─────────────────────────────────────────────────────────

function JsonLdHead({ claim }: { claim: PublicClaimDetail }) {
  useEffect(() => {
    // Remove any previously injected scripts
    document.querySelectorAll('script[data-citation-jsonld]').forEach((el) => el.remove())

    const claimUrl = `https://citation.is/claims/${claim.claim_id}`
    const rating = verdictToRating(claim.verdict)

    // 1. ClaimReview (schema.org)
    const claimReview = {
      '@context': 'https://schema.org',
      '@type': 'ClaimReview',
      url: claimUrl,
      datePublished: claim.created_at
        ? new Date(claim.created_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      author: {
        '@type': 'Organization',
        name: 'citation.is',
        url: 'https://citation.is',
        description: 'Automated scientific claim verification registry — citation.is',
      },
      claimReviewed: claim.claim_text,
      itemReviewed: {
        '@type': 'Claim',
        ...(claim.evidence_url ? {
          appearance: { '@type': 'Article', url: claim.evidence_url, name: claim.document_title ?? undefined },
        } : {}),
        ...(claim.document_title ? {
          author: { '@type': 'CreativeWork', name: claim.document_title },
        } : {}),
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: rating.ratingValue,
        bestRating: rating.bestRating,
        worstRating: rating.worstRating,
        alternateName: rating.alternateName,
      },
      ...(claim.verdict_rationale ? { reviewBody: claim.verdict_rationale } : {}),
    }

    // 2. BreadcrumbList
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Registry', item: 'https://citation.is/registry' },
        { '@type': 'ListItem', position: 2, name: claim.claim_text.slice(0, 60), item: claimUrl },
      ],
    }

    // 3. Upstream JSON-LD (if any)
    const schemas: unknown[] = [claimReview, breadcrumb, ...(claim.jsonld ?? [])]

    schemas.forEach((schema, idx) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.citationJsonld = String(idx)
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    })

    // Update page title and OG meta tags for SEO
    const shortText =
      claim.claim_text.length > 80
        ? claim.claim_text.slice(0, 80).trimEnd() + '…'
        : claim.claim_text
    document.title = `${claim.verdict}: ${shortText} — citation.is`

    // Canonical link tag
    const canonicalUrl = `https://citation.is/claims/${claim.claim_id}`
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const createdCanonical = !canonical
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)

    // OG / Twitter meta tags
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"],meta[name="${property}"]`)
      if (!el) {
        el = document.createElement('meta')
        if (property.startsWith('og:') || property.startsWith('article:')) {
          el.setAttribute('property', property)
        } else {
          el.setAttribute('name', property)
        }
        el.dataset.citationMeta = 'true'
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    const desc = claim.verdict_rationale
      ? claim.verdict_rationale.slice(0, 160)
      : `${claim.verdict} — ${shortText}`
    setMeta('og:title', `${claim.verdict}: ${shortText} — citation.is`)
    setMeta('og:description', desc)
    setMeta('og:url', `https://citation.is/claims/${claim.claim_id}`)
    setMeta('og:type', 'article')
    setMeta('og:site_name', 'citation.is')
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', `${claim.verdict}: ${shortText}`)
    setMeta('twitter:description', desc)

    return () => {
      document.querySelectorAll('script[data-citation-jsonld]').forEach((el) => el.remove())
      document.querySelectorAll('meta[data-citation-meta]').forEach((el) => el.remove())
      if (createdCanonical) canonical?.remove()
      document.title = 'Citation Desk'
    }
  }, [claim])

  return null
}

// ─── Score history panel ─────────────────────────────────────────────────────

function ScoreHistoryPanel({ claimId }: { claimId: number }) {
  const [open, setOpen] = useLocalState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['scoreHistory', claimId],
    queryFn: () => api.claimScoreHistory(claimId),
    staleTime: 10 * 60_000,
    enabled: open,
    retry: 1,
  })
  const history = data as ClaimScoreHistoryResponse | undefined
  const confidencePoints = history?.confidenceHistory?.map((e) => ({
    score: e.confidenceScore,
    recordedAt: e.recordedAt,
  })) ?? []
  const hasData = confidencePoints.length >= 2 || (history?.scoreHistory?.length ?? 0) >= 2
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide w-full text-left group"
        style={{ fontFamily: 'Syne, sans-serif' }}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        )}
        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
        Score History
        {history && (
          <span className="text-xs font-normal text-slate-400 normal-case tracking-normal ml-1">
            ({history.confidenceHistory.length} data points)
          </span>
        )}
      </button>
      {open && (
        <div className="mt-3">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && hasData && (
            <div className="space-y-4">
              {confidencePoints.length >= 2 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Confidence score over time</p>
                  <div className="flex items-center gap-3">
                    <ConfidenceSparkline points={confidencePoints} width={200} height={48} />
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {(confidencePoints[confidencePoints.length - 1].score * 100).toFixed(0)}%
                      </span>{' '}
                      current
                    </div>
                  </div>
                </div>
              )}
              {(history?.scoreHistory?.length ?? 0) >= 2 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Date</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-medium">Composite</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-medium">Support</th>
                        <th className="px-3 py-2 text-right text-slate-500 font-medium">Refute</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history!.scoreHistory.slice(-10).reverse().map((row, i) => (
                        <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-3 py-2 text-slate-500">
                            {new Date(row.snapshotAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-700">
                            {row.compositeScore !== null ? `${(row.compositeScore * 100).toFixed(0)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-600">
                            {row.supportScore !== null ? `${(row.supportScore * 100).toFixed(0)}%` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-red-500">
                            {row.refuteScore !== null ? `${(row.refuteScore * 100).toFixed(0)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!isLoading && !hasData && (
            <p className="text-xs text-slate-400 py-2">No score history recorded yet.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Confidence trend sparkline (inline) ─────────────────────────────────────

function ConfidenceTrendInline({ claimId }: { claimId: number }) {
  const { data } = useQuery({
    queryKey: ['confidenceTrend', claimId],
    queryFn: () => api.confidenceTrendForClaim(claimId),
    staleTime: 10 * 60_000,
    retry: 1,
  })
  if (!data?.points || data.points.length < 2) return null
  return (
    <span className="inline-flex items-center gap-1 ml-1" title="Confidence trend">
      <ConfidenceSparkline points={data.points} />
    </span>
  )
}


// ─── Main component ───────────────────────────────────────────────────────────

export function ClaimDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const claimId = id ? parseInt(id, 10) : NaN

  const { data: claim, isLoading, error } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => api.claimById(claimId),
    enabled: !isNaN(claimId),
    staleTime: 5 * 60_000,
    retry: (failureCount, err) => {
      // Don't retry on 404
      if (err instanceof Error && err.message === 'Claim not found') return false
      return failureCount < 2
    },
  })

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <ClaimDetailSkeleton />
      </div>
    )
  }

  // ─── Error / not found ────────────────────────────────────────────────────

  if (error || !claim) {
    const isNotFound = error instanceof Error && error.message === 'Claim not found'
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-5xl font-bold text-slate-200 mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            {isNotFound ? '404' : '500'}
          </div>
          <p className="text-slate-500 text-sm mb-6">
            {isNotFound
              ? `Claim #${id} was not found in the registry.`
              : 'Failed to load this claim. Please try again.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go back
            </button>
            <Link
              to="/registry"
              className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Browse registry
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const conf = claim.confidence_score
  const updatedDate = new Date(claim.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const createdDate = new Date(claim.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white">
      <JsonLdHead claim={claim} />

      {/* ── Breadcrumb + back nav ── */}
      <div className="border-b border-slate-100 bg-slate-50 py-3">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-slate-700 transition-colors">
              citation.is
            </Link>
            <span>/</span>
            <Link to="/registry" className="hover:text-slate-700 transition-colors">
              Registry
            </Link>
            <span>/</span>
            <span className="text-slate-600 font-medium">Claim #{claim.claim_id}</span>
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* ── Verdict hero ── */}
        <div className="flex items-start gap-4 mb-6">
          <VerdictIcon verdict={claim.verdict} className="w-8 h-8 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <VerdictBadge verdict={claim.verdict} size="md" />
              {conf !== null && (
                <span className={`text-sm font-mono font-medium ${confidenceColor(conf)}`}>
                  {(conf * 100).toFixed(0)}%{' '}
                  <span className="text-slate-400 font-normal text-xs">
                    {confidenceLabel(conf)} confidence
                  </span>
                </span>
              )}
              <ConfidenceTrendInline claimId={claim.claim_id} />
            </div>
            <p className="text-xs text-slate-400">
              Claim #{claim.claim_id} · Last updated {updatedDate}
            </p>
          </div>
        </div>

        {/* ── Claim text ── */}
        <div className="mb-6">
          <h1
            className="text-xl font-bold text-slate-900 leading-snug mb-1"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Claim
          </h1>
          <blockquote className="border-l-4 border-slate-200 pl-4 py-1">
            <p className="text-base text-slate-700 leading-relaxed">{claim.claim_text}</p>
          </blockquote>
        </div>

        {/* ── Source Citations (Priority 1) ── */}
        <CitationsPanel claimId={claim.claim_id} />

        {/* ── Verdict rationale ── */}
        {claim.verdict_rationale && (
          <div className="mb-6">
            <h2
              className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Verification Rationale
            </h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-700 leading-relaxed">{claim.verdict_rationale}</p>
            </div>
          </div>
        )}

        {/* ── Evidence source ── */}
        {claim.evidence_url && (
          <div className="mb-6">
            <h2
              className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              Primary Evidence
            </h2>
            <a
              href={claim.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors group max-w-full"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="truncate">{claim.evidence_url}</span>
            </a>
          </div>
        )}

        {/* ── Metadata grid ── */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Document */}
          <MetaCard
            icon={<FileText className="w-4 h-4 text-slate-400" />}
            label="Source Document"
            value={claim.document_title}
          />

          {/* Domain */}
          {claim.vertical_domain && (
            <MetaCard
              icon={<Dna className="w-4 h-4 text-slate-400" />}
              label="Research Domain"
              value={domainLabel(claim.vertical_domain)}
            />
          )}

          {/* Claim type */}
          <MetaCard
            icon={<Tag className="w-4 h-4 text-slate-400" />}
            label="Claim Type"
            value={claim.claim_type ? claim.claim_type.replace(/_/g, ' ') : 'Unknown'}
          />

          {/* Extracted value */}
          {claim.extracted_value && (
            <MetaCard
              icon={<Tag className="w-4 h-4 text-slate-400" />}
              label="Extracted Value"
              value={claim.extracted_value}
              mono
            />
          )}

          {/* PDB ID */}
          {claim.pdb_id && (
            <MetaCard
              icon={<Tag className="w-4 h-4 text-slate-400" />}
              label="PDB ID"
              value={claim.pdb_id}
              mono
            />
          )}

          {/* Dates */}
          <MetaCard
            icon={<Calendar className="w-4 h-4 text-slate-400" />}
            label="First Verified"
            value={createdDate}
          />
        </div>

        {/* ── Evidence Timeline (Priority 4) ── */}
        <EvidenceTimeline claimText={claim.claim_text} currentClaimId={claim.claim_id} />

        {/* ── Provenance Audit Trail (Priority 5) ── */}
        <ProvenanceAuditTrail claimId={claim.claim_id} />

        {/* ── Score History (Priority 6) ── */}
        <ScoreHistoryPanel claimId={claim.claim_id} />

        {/* ── External links ── */}
        <div className="mb-6">
          <h2
            className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            External Links
          </h2>
          <div className="flex flex-wrap gap-2">
            {claim.audit_url && (
              <a
                href={rewriteUrl(claim.audit_url) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                View full audit report
              </a>
            )}
            {claim.page_url && (
              <a
                href={rewriteUrl(claim.page_url) ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                Canonical claim page
              </a>
            )}
          </div>
        </div>

        {/* ── PDF Report + Embed ── */}
        <ClaimExportPanel claim={claim} />

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/registry"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Registry
          </Link>

          <Link
            to="/audit"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors ml-auto"
          >
            Request an audit
          </Link>
        </div>

        {/* ── Similar claims ── */}
        <SimilarClaims claimId={claim.claim_id} claimText={claim.claim_text} />

        {/* ── Claim ID footer ── */}
        <p className="mt-6 text-xs text-slate-300 font-mono">
          citation.is/claims/{claim.claim_id} · doc:{claim.document_id}
        </p>
      </div>
    </div>
  )
}

// ─── ClaimExportPanel ───────────────────────────────────────────────────────────

type ExportClaim = {
  claim_id: number
  claim_text: string
  verdict: string
  confidence_score: number | null
  verdict_rationale: string | null
  evidence_url: string | null
  document_title: string
  vertical_domain: string | null
  claim_type: string | null
  created_at: string
  updated_at: string
}

function ClaimExportPanel({ claim }: { claim: ExportClaim }) {
  const [tab, setTab] = useLocalState<'pdf' | 'embed'>('pdf')
  const [copied, setCopied] = useLocalState(false)
  const [pdfLoading, setPdfLoading] = useLocalState(false)

  const claimUrl = `https://citation.is/claims/${claim.claim_id}`
  const verdictColor = {
    Supported: '#10b981',
    Refuted: '#ef4444',
    Ambiguous: '#f59e0b',
    'Out of Scope': '#94a3b8',
  }[claim.verdict] ?? '#94a3b8'

  // SVG embed badge
  const badgeSvg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="24" viewBox="0 0 200 24">`,
    `  <rect width="200" height="24" rx="4" fill="#f8fafc"/>`,
    `  <rect width="200" height="24" rx="4" fill="none" stroke="#e2e8f0" stroke-width="1"/>`,
    `  <rect x="0" y="0" width="80" height="24" rx="4" fill="${verdictColor}"/>`,
    `  <rect x="76" y="0" width="4" height="24" fill="${verdictColor}"/>`,
    `  <text x="8" y="16" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="white">${claim.verdict}</text>`,
    `  <text x="88" y="16" font-family="system-ui,sans-serif" font-size="10" fill="#475569">citation.is/${claim.claim_id}</text>`,
    `</svg>`,
  ].join('\n')

  const embedHtml = `<a href="${claimUrl}" target="_blank" rel="noopener noreferrer" title="Verified by citation.is">${badgeSvg}</a>`

  const embedMarkdown = `[![${claim.verdict} — citation.is](https://citation.is/api/public/badge/${claim.claim_id}.svg)](${claimUrl})`

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function downloadPdf() {
    setPdfLoading(true)
    try {
      // Build a minimal print-ready HTML document and open it in a new tab
      // The user can then use browser Print → Save as PDF
      const conf = claim.confidence_score !== null ? `${(claim.confidence_score * 100).toFixed(0)}%` : 'N/A'
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Claim #${claim.claim_id} — citation.is</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; color: #1e293b; line-height: 1.6; }
    h1 { font-size: 1.25rem; margin-bottom: 0.25rem; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; color: white; background: ${verdictColor}; }
    .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem; }
    blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; margin: 0 0 1.5rem; color: #334155; }
    .section { margin-bottom: 1.25rem; }
    .label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.25rem; }
    .value { font-size: 0.9rem; }
    a { color: #3b82f6; }
    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Claim Verification Report</h1>
  <div class="meta">citation.is · Claim #${claim.claim_id} · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="section">
    <div class="label">Verdict</div>
    <span class="badge">${claim.verdict}</span>
    <span style="margin-left:8px;font-size:0.85rem;color:#64748b">Confidence: ${conf}</span>
  </div>
  <div class="section">
    <div class="label">Claim</div>
    <blockquote>${claim.claim_text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</blockquote>
  </div>
  ${claim.verdict_rationale ? `<div class="section"><div class="label">Verification Rationale</div><div class="value">${claim.verdict_rationale.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>` : ''}
  ${claim.evidence_url ? `<div class="section"><div class="label">Primary Evidence</div><div class="value"><a href="${claim.evidence_url}">${claim.evidence_url}</a></div></div>` : ''}
  <div class="section">
    <div class="label">Source Document</div>
    <div class="value">${claim.document_title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
  ${claim.vertical_domain ? `<div class="section"><div class="label">Research Domain</div><div class="value">${claim.vertical_domain}</div></div>` : ''}
  <footer>
    Verified by citation.is — <a href="${claimUrl}">${claimUrl}</a><br>
    This report is provided under CC BY 4.0. Cite as: citation.is/claims/${claim.claim_id}
  </footer>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        win.onload = () => {
          setTimeout(() => {
            win.print()
            URL.revokeObjectURL(url)
          }, 500)
        }
      }
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <h2
        className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        Export &amp; Embed
      </h2>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('pdf')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === 'pdf' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          PDF Report
        </button>
        <button
          onClick={() => setTab('embed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            tab === 'embed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Embed Badge
        </button>
      </div>

      {tab === 'pdf' && (
        <div className="rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-4">
            Download a print-ready verification report for Claim #{claim.claim_id}.
            The report includes the verdict, rationale, evidence source, and provenance metadata.
          </p>
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {pdfLoading ? 'Preparing…' : 'Download PDF'}
          </button>
          <p className="text-xs text-slate-400 mt-3">
            Opens a print dialog. Choose &ldquo;Save as PDF&rdquo; in your browser.
            Report is provided under{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">
              CC BY 4.0
            </a>.
          </p>
        </div>
      )}

      {tab === 'embed' && (
        <div className="rounded-xl border border-slate-200 p-5 space-y-5">
          {/* Badge preview */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
            <div
              className="inline-block"
              dangerouslySetInnerHTML={{ __html: badgeSvg }}
            />
          </div>

          {/* HTML snippet */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HTML</p>
              <button
                onClick={() => copyToClipboard(embedHtml)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 whitespace-pre-wrap break-all">{embedHtml}</pre>
          </div>

          {/* Markdown snippet */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Markdown</p>
              <button
                onClick={() => copyToClipboard(embedMarkdown)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 whitespace-pre-wrap break-all">{embedMarkdown}</pre>
          </div>

          <p className="text-xs text-slate-400">
            Paste the HTML snippet into any webpage or the Markdown into a README to display a live verification badge.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── MetaCard ─────────────────────────────────────────────────────────────────

function MetaCard({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={`text-sm text-slate-800 leading-snug ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ClaimDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back button placeholder */}
      <div className="h-5 w-16 bg-slate-100 rounded animate-pulse mb-6" />

      {/* Verdict hero */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse shrink-0" />
        <div className="flex-1">
          <div className="h-6 w-28 bg-slate-100 rounded-full animate-pulse mb-2" />
          <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>

      {/* Claim text */}
      <div className="mb-6">
        <div className="h-5 w-16 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-4/6" />
        </div>
      </div>

      {/* Rationale */}
      <div className="mb-6">
        <div className="h-5 w-40 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6" />
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3.5">
            <div className="h-3 w-20 bg-slate-100 rounded animate-pulse mb-2" />
            <div className="h-4 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
