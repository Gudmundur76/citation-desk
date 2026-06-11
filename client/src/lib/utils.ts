import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Verdict = 'Supported' | 'Refuted' | 'Ambiguous' | 'Insufficient Evidence'

export function verdictColor(verdict: string): string {
  switch (verdict) {
    case 'Supported': return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'Refuted': return 'text-red-700 bg-red-50 border-red-200'
    case 'Ambiguous': return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'Insufficient Evidence': return 'text-slate-600 bg-slate-50 border-slate-200'
    default: return 'text-slate-600 bg-slate-50 border-slate-200'
  }
}

export function verdictDot(verdict: string): string {
  switch (verdict) {
    case 'Supported': return 'bg-emerald-500'
    case 'Refuted': return 'bg-red-500'
    case 'Ambiguous': return 'bg-amber-500'
    case 'Insufficient Evidence': return 'bg-slate-400'
    default: return 'bg-slate-400'
  }
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function confidenceLabel(score: number): string {
  if (score >= 0.85) return 'High'
  if (score >= 0.65) return 'Medium'
  return 'Low'
}

export function confidenceColor(score: number): string {
  if (score >= 0.85) return 'text-emerald-600'
  if (score >= 0.65) return 'text-amber-600'
  return 'text-red-500'
}

export function domainLabel(domain: string | null | undefined): string {
  if (!domain) return 'Unknown'
  const map: Record<string, string> = {
    structural_biology: 'Structural Biology',
    salmon_biotech: 'Salmon Biotech',
    genomics: 'Genomics',
    clinical_trials: 'Clinical Trials',
    nutrition: 'Nutrition Science',
  }
  return map[domain] ?? domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}
