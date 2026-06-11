/**
 * CitationTypeBadge — small badge for VERIFIED / CONTESTED / IMPLIED / BEYOND_EVIDENCE
 * citation types from the Phase 96 citation layer.
 */
import type { CitationType } from '@/lib/api'

const CONFIG: Record<
  CitationType,
  { label: string; bg: string; text: string; dot: string }
> = {
  VERIFIED: {
    label: 'Verified',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  CONTESTED: {
    label: 'Contested',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  IMPLIED: {
    label: 'Implied',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  BEYOND_EVIDENCE: {
    label: 'Beyond Evidence',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
}

export function CitationTypeBadge({ type }: { type: CitationType }) {
  const c = CONFIG[type] ?? CONFIG.IMPLIED
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}
