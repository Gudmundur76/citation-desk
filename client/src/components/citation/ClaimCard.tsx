import { Link } from 'react-router-dom'
import { VerdictBadge } from './VerdictBadge'
import { CitationTypeBadge } from './CitationTypeBadge'
import { confidenceColor, confidenceLabel, domainLabel, truncate } from '@/lib/utils'
import type { ClaimResult } from '@/lib/api'

interface Props {
  claim: ClaimResult
  showDocument?: boolean
}

export function ClaimCard({ claim, showDocument = true }: Props) {
  const conf = claim.confidenceScore ?? 0
  const topCitation = claim.citations?.[0]

  return (
    <Link to={`/claims/${claim.id}`} className="block group">
      <article className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <VerdictBadge verdict={claim.verdict} />
            {topCitation && (
              <CitationTypeBadge type={topCitation.citationType} />
            )}
          </div>
          <span className={`text-xs font-medium font-mono shrink-0 ${confidenceColor(conf)}`}>
            {(conf * 100).toFixed(0)}% {confidenceLabel(conf)}
          </span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed mb-3 group-hover:text-slate-900 transition-colors">
          {truncate(claim.claimText, 280)}
        </p>
        {topCitation?.passageText && (
          <blockquote className="mb-3 pl-3 border-l-2 border-slate-200 text-xs text-slate-500 italic leading-relaxed">
            "{truncate(topCitation.passageText, 140)}"
          </blockquote>
        )}
        {showDocument && claim.documentTitle && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
            <span className="truncate">{truncate(claim.documentTitle, 80)}</span>
            <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
              {domainLabel(claim.verticalDomain)}
            </span>
          </div>
        )}
      </article>
    </Link>
  )
}
