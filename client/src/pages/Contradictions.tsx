/**
 * /contradictions — Live feed of scientific contradictions detected in the knowledge graph.
 *
 * Renders pairs of entities that assert opposing claims, sourced from the
 * graph.contradictions tRPC procedure (Phase 107 Contradiction Detection Engine).
 *
 * Each row shows:
 *   - Source entity ↔ Target entity
 *   - Relation type (semantic_opposite, etc.)
 *   - Edge weight (strength of contradiction)
 *   - Link to the evidence document
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Zap, AlertTriangle, Info } from 'lucide-react'
import { api } from '@/lib/api'
import type { ContradictionEntry } from '@/lib/api'

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ weight }: { weight: number | null }) {
  const w = weight ?? 0
  if (w >= 0.75) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
        <Zap className="w-3 h-3" />
        High
      </span>
    )
  }
  if (w >= 0.4) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
        <AlertTriangle className="w-3 h-3" />
        Medium
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      <Info className="w-3 h-3" />
      Low
    </span>
  )
}

// ─── Contradiction row ────────────────────────────────────────────────────────

function ContradictionRow({ entry, index }: { entry: ContradictionEntry; index: number }) {
  const sourceName = entry.sourceEntity?.canonicalName ?? `Entity #${entry.sourceEntityId}`
  const targetName = entry.targetEntity?.canonicalName ?? `Entity #${entry.targetEntityId}`
  const sourceType = entry.sourceEntity?.entityType
  const targetType = entry.targetEntity?.entityType

  const date = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      className={`px-4 py-3.5 border-b border-slate-100 last:border-0 ${
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
      } hover:bg-slate-50 transition-colors`}
    >
      <div className="flex items-start gap-3">
        {/* Rank / index */}
        <span className="text-xs font-mono text-slate-300 w-6 shrink-0 pt-0.5">
          {index + 1}
        </span>

        {/* Entity pair */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              to={`/entity/${sourceType ?? 'concept'}/${encodeURIComponent(sourceName)}`}
              className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {sourceName}
            </Link>
            {sourceType && (
              <span className="text-xs text-slate-400 capitalize">{sourceType}</span>
            )}

            <ArrowLeftRight className="w-3.5 h-3.5 text-red-400 shrink-0" />

            <Link
              to={`/entity/${targetType ?? 'concept'}/${encodeURIComponent(targetName)}`}
              className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {targetName}
            </Link>
            {targetType && (
              <span className="text-xs text-slate-400 capitalize">{targetType}</span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SeverityBadge weight={entry.edgeWeight} />
            <span className="text-xs text-slate-400 font-mono">
              {entry.relationType.replace(/_/g, ' ')}
            </span>
            {entry.edgeWeight !== null && (
              <span className="text-xs text-slate-400">
                weight: {entry.edgeWeight.toFixed(2)}
              </span>
            )}
            <span className="text-xs text-slate-300 ml-auto">{date}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Contradictions() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['contradictions'],
    queryFn: () => api.graphContradictions(),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const high = entries?.filter((e) => (e.edgeWeight ?? 0) >= 0.75).length ?? 0
  const medium = entries?.filter((e) => {
    const w = e.edgeWeight ?? 0
    return w >= 0.4 && w < 0.75
  }).length ?? 0
  const low = entries?.filter((e) => (e.edgeWeight ?? 0) < 0.4).length ?? 0

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Scientific Contradictions
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
            Pairs of entities in the knowledge graph that assert opposing claims, detected
            automatically by the contradiction engine. Severity is proportional to edge weight.
          </p>
        </div>

        {/* Summary pills */}
        {entries && entries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
              <Zap className="w-3 h-3" />
              {high} High
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              {medium} Medium
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              <Info className="w-3 h-3" />
              {low} Low
            </span>
            <span className="text-xs text-slate-400 self-center ml-1">
              {entries.length} total contradictions detected
            </span>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`px-4 py-4 border-b border-slate-100 last:border-0 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-6 h-4 bg-slate-100 rounded animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {entries && entries.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr] gap-0 text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <span>#</span>
              <span>Entity Pair · Relation · Severity</span>
            </div>

            {entries.map((entry, i) => (
              <ContradictionRow key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {entries && entries.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              No contradictions detected yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              The contradiction engine runs automatically as new documents are ingested.
            </p>
          </div>
        )}

        {/* Footer note */}
        <p className="mt-6 text-xs text-slate-300">
          Contradictions are detected by the citation.is autonomous knowledge graph engine. Updated continuously.
        </p>
      </div>
    </div>
  )
}
