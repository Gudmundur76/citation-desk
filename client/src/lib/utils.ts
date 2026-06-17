import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Verdict =
  | 'Supported'
  | 'Partially Supported'
  | 'Refuted'
  | 'Ambiguous'
  | 'Contradicted'
  | 'Insufficient Evidence'
  | 'Out of Scope'
  | 'Needs Expert Review'

export function verdictColor(verdict: string): string {
  switch (verdict) {
    case 'Supported': return 'text-emerald-700 bg-emerald-50 border-emerald-200'
    case 'Partially Supported': return 'text-teal-700 bg-teal-50 border-teal-200'
    case 'Refuted': return 'text-red-700 bg-red-50 border-red-200'
    case 'Ambiguous': return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'Contradicted': return 'text-orange-700 bg-orange-50 border-orange-200'
    case 'Insufficient Evidence': return 'text-slate-600 bg-slate-50 border-slate-200'
    case 'Out of Scope': return 'text-purple-700 bg-purple-50 border-purple-200'
    case 'Needs Expert Review': return 'text-blue-700 bg-blue-50 border-blue-200'
    default: return 'text-slate-600 bg-slate-50 border-slate-200'
  }
}

export function verdictDot(verdict: string): string {
  switch (verdict) {
    case 'Supported': return 'bg-emerald-500'
    case 'Partially Supported': return 'bg-teal-500'
    case 'Refuted': return 'bg-red-500'
    case 'Ambiguous': return 'bg-amber-500'
    case 'Contradicted': return 'bg-orange-500'
    case 'Insufficient Evidence': return 'bg-slate-400'
    case 'Out of Scope': return 'bg-purple-400'
    case 'Needs Expert Review': return 'bg-blue-400'
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
    food_safety: 'Food Safety',
    economics_macro: 'Macroeconomics',
    legal: 'Law & Regulation',
    molecular_biology: 'Molecular Biology',
    social_science: 'Social Science',
    energy: 'Energy',
    earth_science: 'Earth Science',
  }
  return map[domain] ?? domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}
