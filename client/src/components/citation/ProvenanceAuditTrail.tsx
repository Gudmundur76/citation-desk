/**
 * ProvenanceAuditTrail — collapsible audit trail showing the full pipeline history
 * for a single claim: extraction, scoring, re-evaluation, and human overrides.
 *
 * Data source: tRPC provenance.getChain (Phase 103 provenance service)
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, GitBranch } from 'lucide-react'
import { api } from '@/lib/api'

interface Props {
  claimId: number
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  EXTRACTED: { label: 'Extracted', color: 'text-blue-600' },
  SCORED: { label: 'Scored', color: 'text-indigo-600' },
  RE_EVALUATED: { label: 'Re-evaluated', color: 'text-violet-600' },
  HUMAN_OVERRIDE: { label: 'Human Override', color: 'text-amber-600' },
  VERDICT_CHANGED: { label: 'Verdict Changed', color: 'text-orange-600' },
  ARCHIVED: { label: 'Archived', color: 'text-slate-400' },
}

export function ProvenanceAuditTrail({ claimId }: Props) {
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['provenance', claimId],
    queryFn: () => api.claimProvenanceChain(claimId),
    staleTime: 10 * 60_000,
    enabled: open, // only fetch when expanded
    retry: 1,
  })

  const summary = data?.summary
  const chain = data?.chain ?? []

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
        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
        Audit Trail
        {summary && (
          <span className="text-xs font-normal text-slate-400 normal-case tracking-normal ml-1">
            ({summary.totalEvents} events)
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && summary && (
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
              {summary.firstVerdict && (
                <span>
                  Initial verdict:{' '}
                  <span className="font-semibold text-slate-700">{summary.firstVerdict}</span>
                </span>
              )}
              {summary.reEvaluations > 0 && (
                <span>
                  Re-evaluations:{' '}
                  <span className="font-semibold text-slate-700">{summary.reEvaluations}</span>
                </span>
              )}
              {summary.humanOverrides > 0 && (
                <span className="text-amber-600 font-semibold">
                  {summary.humanOverrides} human override{summary.humanOverrides > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {!isLoading && chain.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {chain.map((ev, i) => {
                const cfg = EVENT_LABELS[ev.eventType] ?? {
                  label: ev.eventType,
                  color: 'text-slate-500',
                }
                const date = new Date(ev.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                return (
                  <div
                    key={ev.id}
                    className={`px-4 py-2.5 text-xs flex items-start gap-3 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    } border-b border-slate-100 last:border-0`}
                  >
                    <span className={`font-semibold shrink-0 w-28 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-slate-500 shrink-0">{date}</span>
                    <span className="text-slate-600 flex-1">
                      {ev.fromVerdict && ev.toVerdict && ev.fromVerdict !== ev.toVerdict && (
                        <span>
                          {ev.fromVerdict} → {ev.toVerdict}
                          {ev.fromScore !== null && ev.toScore !== null && (
                            <span className="text-slate-400 ml-1">
                              ({(ev.fromScore * 100).toFixed(0)}% → {(ev.toScore * 100).toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      )}
                      {ev.notes && <span className="italic text-slate-400">{ev.notes}</span>}
                      {ev.agentId && (
                        <span className="ml-1 font-mono text-slate-400">
                          [{ev.agentId}]
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {!isLoading && chain.length === 0 && (
            <p className="text-xs text-slate-400 py-2">No audit events recorded yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
