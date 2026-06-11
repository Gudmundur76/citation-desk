/**
 * /entity/:type/:name — Knowledge graph entity page.
 *
 * Displays all verified claims that mention a specific entity (protein,
 * compound, organism, method, etc.) from the ttruthdesk.claims knowledge
 * graph. The entity name is URL-decoded and used as a free-text query
 * against the public claims API.
 *
 * Data source: GET /api/external/public/claims?q=:name
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
  Dna,
  FlaskConical,
  Microscope,
  Tag,
} from 'lucide-react'
import { api } from '@/lib/api'
import { VerdictBadge } from '@/components/citation/VerdictBadge'
import { confidenceColor, confidenceLabel, formatNumber } from '@/lib/utils'

const ENTITY_TYPE_ICONS: Record<string, React.ElementType> = {
  protein: Dna,
  compound: FlaskConical,
  organism: Microscope,
  method: Tag,
  default: Tag,
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  protein: 'Protein',
  compound: 'Compound',
  organism: 'Organism',
  method: 'Method',
  gene: 'Gene',
  structure: 'Structure',
  drug: 'Drug',
  pathway: 'Pathway',
}

function VerdictIcon({ verdict, className }: { verdict: string; className?: string }) {
  const cls = className ?? 'w-4 h-4'
  switch (verdict) {
    case 'Supported': return <CheckCircle2 className={`${cls} text-emerald-500`} />
    case 'Refuted': return <XCircle className={`${cls} text-red-500`} />
    case 'Ambiguous': return <AlertCircle className={`${cls} text-amber-500`} />
    default: return <HelpCircle className={`${cls} text-slate-400`} />
  }
}

export function EntityPage() {
  const { type, name } = useParams<{ type: string; name: string }>()
  const entityName = decodeURIComponent(name ?? '')
  const entityType = type ?? 'entity'

  const { data, isLoading, error } = useQuery({
    queryKey: ['entityClaims', entityName],
    queryFn: () => api.registryClaims({ q: entityName, page: 1, page_size: 100 }),
    enabled: entityName.length > 0,
    staleTime: 60_000,
  })

  const claims = data?.claims ?? []
  const Icon = ENTITY_TYPE_ICONS[entityType] ?? ENTITY_TYPE_ICONS.default
  const typeLabel = ENTITY_TYPE_LABELS[entityType] ?? entityType.charAt(0).toUpperCase() + entityType.slice(1)

  const supportedCount = claims.filter(c => c.verdict === 'Supported').length
  const refutedCount = claims.filter(c => c.verdict === 'Refuted').length

  const kgUrl = `https://ttruthdesk.claims/entity/${entityType}/${encodeURIComponent(entityName)}`

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/4" />
          <div className="h-10 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-50 rounded-xl border border-slate-100" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-slate-500 text-sm">Failed to load entity data. Please try again.</p>
        <Link to="/registry" className="text-slate-900 font-medium text-sm underline mt-4 inline-block">
          ← Back to Registry
        </Link>
      </div>
    )
  }

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

      {/* Entity header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {typeLabel}
          </span>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          {entityName}
        </h1>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          {claims.length > 0 && (
            <>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{formatNumber(claims.length)}</span> claims found
              </span>
              {supportedCount > 0 && (
                <span className="text-sm text-emerald-600">
                  <span className="font-semibold">{supportedCount}</span> supported
                </span>
              )}
              {refutedCount > 0 && (
                <span className="text-sm text-red-500">
                  <span className="font-semibold">{refutedCount}</span> refuted
                </span>
              )}
            </>
          )}
          <a
            href={kgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            View in Knowledge Graph
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Claims */}
      {claims.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl">
          <Tag className="w-8 h-8 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No claims found for "{entityName}"</p>
          <p className="text-slate-400 text-xs mt-1">
            This entity may not yet be indexed in the knowledge graph.
          </p>
          <Link
            to="/registry"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mt-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Browse all claims
          </Link>
        </div>
      ) : (
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
                    <span className="text-xs text-slate-400 truncate max-w-xs">
                      {claim.document_title}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">
          Knowledge graph powered by{' '}
          <a
            href="https://ttruthdesk.claims"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600 transition-colors"
          >
            Protein Truth Desk
          </a>{' '}
          · citation.is
        </p>
      </div>
    </div>
  )
}
