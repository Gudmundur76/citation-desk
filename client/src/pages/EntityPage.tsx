/**
 * /entity/:type/:name — Knowledge graph entity page.
 *
 * Phase C3: Enhanced with:
 * - Evidence timeline via timeline.forEntity (all claims mentioning entity)
 * - Co-occurrence related entities panel via cooccurrence.forEntity
 * - Confidence trend sparkline (avg confidence over time)
 * - Verdict distribution bar
 * - OG meta tags for social sharing
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ExternalLink,
  Dna,
  FlaskConical,
  Microscope,
  Tag,
  Network,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  FileText,
} from 'lucide-react'
import { api } from '@/lib/api'
import { VerdictBadge } from '@/components/citation/VerdictBadge'
import { ConfidenceSparkline } from '@/components/citation/ConfidenceSparkline'
import { confidenceColor, confidenceLabel, formatNumber } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITY_TYPE_ICONS: Record<string, React.ElementType> = {
  protein: Dna,
  compound: FlaskConical,
  organism: Microscope,
  method: Tag,
  author: User,
  document: FileText,
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
  author: 'Author',
  concept: 'Concept',
  document: 'Document',
}

function TrendIcon({ trend }: { trend: 'improving' | 'declining' | 'stable' }) {
  if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-500" />
  if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />
  return <Minus className="w-4 h-4 text-slate-400" />
}

// ─── Co-occurrence panel ─────────────────────────────────────────────────────

function CooccurrencePanel({
  entityId,
  entityName,
}: {
  entityId: number
  entityName: string
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['cooccurrence', entityId],
    queryFn: () => api.cooccurrenceForEntity(entityId, 12),
    staleTime: 300_000,
  })

  const related = (data?.nodes ?? []).filter(n => n.canonicalName !== entityName)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!related.length) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        No co-occurring entities found yet.
      </p>
    )
  }

  const maxWeight = Math.max(...related.map(n => n.weight), 1)

  return (
    <div className="space-y-1.5">
      {related.slice(0, 10).map(node => (
        <Link
          key={node.id}
          to={`/entity/concept/${encodeURIComponent(node.canonicalName)}`}
          className="flex items-center gap-2 group hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div
            className="h-1.5 rounded-full bg-slate-200 group-hover:bg-slate-300 transition-colors shrink-0"
            style={{ width: `${Math.max(16, (node.weight / maxWeight) * 80)}px` }}
          />
          <span className="text-sm text-slate-700 group-hover:text-slate-900 truncate flex-1 min-w-0">
            {node.canonicalName}
          </span>
          <span className="text-xs text-slate-400 shrink-0 capitalize">
            {node.entityType?.toLowerCase() ?? ''}
          </span>
        </Link>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EntityPage() {
  const { type, name } = useParams<{ type: string; name: string }>()
  const entityName = decodeURIComponent(name ?? '')
  const entityType = type ?? 'entity'
  const entitySlug = name ?? ''

  // Evidence timeline (primary data source for Phase C3)
  const { data: timeline, isLoading, error } = useQuery({
    queryKey: ['entityTimeline', entitySlug],
    queryFn: () => api.timelineForEntity(entitySlug, 100),
    enabled: entitySlug.length > 0,
    staleTime: 120_000,
  })

  const Icon = ENTITY_TYPE_ICONS[entityType] ?? ENTITY_TYPE_ICONS.default
  const typeLabel = ENTITY_TYPE_LABELS[entityType] ?? entityType.charAt(0).toUpperCase() + entityType.slice(1)

  const entity = timeline?.entity
  const events = timeline?.events ?? []
  const summary = timeline?.summary

  const supportedCount = events.filter(e => e.verdict === 'Supported').length
  const refutedCount = events.filter(e => e.verdict === 'Refuted').length

  // Build sparkline points from confidence scores
  const sparklinePoints = events
    .filter(e => e.confidenceScore !== null)
    .slice(-20)
    .map(e => ({ score: e.confidenceScore as number, recordedAt: e.claimCreatedAt }))

  const kgUrl = `https://citation.is/entity/${entityType}/${encodeURIComponent(entityName)}`

  // OG meta tags + canonical link
  useEffect(() => {
    const title = `${entityName} — citation.is`
    const desc = summary
      ? `${summary.totalEvents} verified claims mentioning ${entityName}. Average confidence: ${summary.averageConfidence !== null ? Math.round(summary.averageConfidence * 100) + '%' : 'N/A'}.`
      : `Scientific claims mentioning ${entityName} — citation.is`
    document.title = title
    const setMeta = (prop: string, val: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', prop)
        document.head.appendChild(el)
      }
      el.setAttribute('content', val)
    }
    setMeta('og:title', title)
    setMeta('og:description', desc)
    setMeta('og:type', 'website')
    setMeta('og:site_name', 'citation.is')
    // Canonical link
    const canonicalUrl = `https://citation.is/entity/${entityType}/${encodeURIComponent(entityName)}`
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const createdCanonical = !canonical
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)
    return () => {
      document.title = 'citation.is'
      if (createdCanonical) canonical?.remove()
    }
  }, [entityName, entityType, summary])

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-8" />
        <div className="h-8 w-64 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-4 w-48 bg-slate-100 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-slate-100 rounded-xl animate-pulse" />
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
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

        {/* Confidence sparkline */}
        {sparklinePoints.length >= 2 && summary && (
          <div className="flex items-center gap-3 mt-3">
            <ConfidenceSparkline points={sparklinePoints} width={80} height={24} />
            <div className="flex items-center gap-1.5">
              <TrendIcon trend={summary.confidenceTrend} />
              <span className="text-xs text-slate-500 capitalize">{summary.confidenceTrend}</span>
              {summary.averageConfidence !== null && (
                <span className={`text-xs font-medium ${confidenceColor(summary.averageConfidence)}`}>
                  avg {Math.round(summary.averageConfidence * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {events.length > 0 && (
            <>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{formatNumber(events.length)}</span> claims
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
              {summary?.earliestYear && summary?.latestYear && (
                <span className="text-sm text-slate-400">
                  {summary.earliestYear}–{summary.latestYear}
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
            <Network className="w-3 h-3" />
            Knowledge Graph
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Verdict distribution bar */}
        {summary && summary.totalEvents > 0 && (
          <div className="mt-4">
            <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
              {Object.entries(summary.verdictDistribution).map(([verdict, count]) => {
                const pct = (count / summary.totalEvents) * 100
                const colors: Record<string, string> = {
                  Supported: 'bg-emerald-400',
                  Refuted: 'bg-red-400',
                  Ambiguous: 'bg-amber-400',
                  'Insufficient Evidence': 'bg-slate-300',
                }
                return (
                  <div
                    key={verdict}
                    className={`${colors[verdict] ?? 'bg-slate-200'} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${verdict}: ${count}`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {Object.entries(summary.verdictDistribution).map(([verdict, count]) => (
                <span key={verdict} className="text-xs text-slate-500">
                  {verdict}: <span className="font-medium text-slate-700">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claims list */}
        <div className="lg:col-span-2">
          {events.length === 0 ? (
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
              {events.map(event => (
                <Link
                  key={event.claimId}
                  to={`/claims/${event.claimId}`}
                  className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 leading-relaxed mb-2 group-hover:text-slate-900 transition-colors line-clamp-3">
                        {event.claimText}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <VerdictBadge verdict={event.verdict} />
                        {event.confidenceScore !== null && (
                          <span className={`text-xs font-medium ${confidenceColor(event.confidenceScore)}`}>
                            {confidenceLabel(event.confidenceScore)} confidence
                          </span>
                        )}
                        {event.pubYear && (
                          <span className="text-xs text-slate-400">{event.pubYear}</span>
                        )}
                        <span className="text-xs text-slate-400 truncate max-w-xs">
                          {event.documentTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Co-occurrence panel */}
          {entity && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Network className="w-4 h-4 text-slate-400" />
                Related Entities
              </h3>
              <CooccurrencePanel entityId={entity.id} entityName={entityName} />
            </div>
          )}

          {/* Summary stats */}
          {summary && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Evidence Summary</h3>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Total claims</dt>
                  <dd className="font-medium text-slate-900">{formatNumber(summary.totalEvents)}</dd>
                </div>
                {summary.averageConfidence !== null && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-slate-500">Avg confidence</dt>
                    <dd className={`font-medium ${confidenceColor(summary.averageConfidence)}`}>
                      {Math.round(summary.averageConfidence * 100)}%
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Trend</dt>
                  <dd className="flex items-center gap-1">
                    <TrendIcon trend={summary.confidenceTrend} />
                    <span className="font-medium text-slate-700 capitalize">{summary.confidenceTrend}</span>
                  </dd>
                </div>
                {summary.earliestYear && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-slate-500">Year range</dt>
                    <dd className="font-medium text-slate-700">
                      {summary.earliestYear}–{summary.latestYear ?? '?'}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400">
          Knowledge graph · citation.is
        </p>
      </div>
    </div>
  )
}
