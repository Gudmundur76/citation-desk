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
 *   - Link back to the registry and to the audit on ttruthdesk.claims
 *
 * Data source: GET /api/external/public/claims/:id (public REST API, proxied server-side)
 */
import { useQuery } from '@tanstack/react-query'
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
} from 'lucide-react'
import { api } from '@/lib/api'
import { VerdictBadge } from '@/components/citation/VerdictBadge'
import { domainLabel, confidenceColor, confidenceLabel } from '@/lib/utils'
import type { PublicClaimDetail } from '@/lib/api'

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

// ─── JSON-LD injector ─────────────────────────────────────────────────────────

function JsonLdHead({ claim }: { claim: PublicClaimDetail }) {
  useEffect(() => {
    if (!claim.jsonld?.length) return

    const existing = document.querySelectorAll('script[data-citation-jsonld]')
    existing.forEach((el) => el.remove())

    claim.jsonld.forEach((schema, idx) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.citationJsonld = String(idx)
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    })

    // Update page title for SEO
    const shortText =
      claim.claim_text.length > 80
        ? claim.claim_text.slice(0, 80).trimEnd() + '…'
        : claim.claim_text
    document.title = `${claim.verdict}: ${shortText} — citation.is`

    return () => {
      document.querySelectorAll('script[data-citation-jsonld]').forEach((el) => el.remove())
      document.title = 'Citation Desk'
    }
  }, [claim])

  return null
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
          <div>
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
          <MetaCard
            icon={<Dna className="w-4 h-4 text-slate-400" />}
            label="Research Domain"
            value={domainLabel(claim.vertical_domain)}
          />

          {/* Claim type */}
          <MetaCard
            icon={<Tag className="w-4 h-4 text-slate-400" />}
            label="Claim Type"
            value={claim.claim_type.replace(/_/g, ' ')}
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
                href={claim.audit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                View full audit on Truth Desk
              </a>
            )}
            {claim.page_url && (
              <a
                href={claim.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                Claim page on Truth Desk
              </a>
            )}
          </div>
        </div>

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
            to={`/search?q=${encodeURIComponent(claim.claim_text.slice(0, 60))}`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Find similar claims
          </Link>

          <Link
            to="/audit"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors ml-auto"
          >
            Request an audit
          </Link>
        </div>

        {/* ── Claim ID footer ── */}
        <p className="mt-6 text-xs text-slate-300 font-mono">
          citation.is/claims/{claim.claim_id} · doc:{claim.document_id}
        </p>
      </div>
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
