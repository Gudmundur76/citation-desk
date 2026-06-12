/**
 * /registry — Searchable, filterable, paginated list of all verified claims
 * in the citation.is knowledge base.
 *
 * Data source: GET /api/external/public/claims (public REST API, proxied server-side)
 * Supports: free-text search, verdict filter, vertical domain filter, page navigation.
 */
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import {
  Search as SearchIcon,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
} from 'lucide-react'
import { api } from '@/lib/api'
import { VerdictBadge } from '@/components/citation/VerdictBadge'
import { domainLabel, confidenceColor, confidenceLabel, truncate } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

const VERDICTS = [
  'Supported',
  'Refuted',
  'Ambiguous',
  'Insufficient Evidence',
  'Out of Scope',
]

const DOMAINS = ['salmon_biotech', 'structural_biology']

const CLAIM_TYPES = [
  { value: 'protein_name', label: 'Protein' },
  { value: 'organism', label: 'Organism' },
  { value: 'general_molecular', label: 'Molecular' },
  { value: 'ligand', label: 'Ligand' },
  { value: 'experimental_method', label: 'Method' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function RegistryPage() {
  const [params, setParams] = useSearchParams()
  const [inputValue, setInputValue] = useState(params.get('q') ?? '')
  const [showFilters, setShowFilters] = useState(false)

  // Derive controlled state from URL params
  const q = params.get('q') ?? ''
  const verdict = params.get('verdict') ?? ''
  const vertical = params.get('vertical') ?? ''
  const claimType = params.get('claim_type') ?? ''
  const page = parseInt(params.get('page') ?? '1', 10)

  // Sync input field when URL changes (e.g. browser back/forward)
  useEffect(() => {
    setInputValue(params.get('q') ?? '')
  }, [params])

  // Fetch current page
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['registry', q, verdict, vertical, claimType, page],
    queryFn: () =>
      api.registryClaims({
        page,
        page_size: PAGE_SIZE,
        q: q || undefined,
        verdict: verdict || undefined,
        vertical: vertical || undefined,
        claim_type: claimType || undefined,
      }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function buildParams(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (verdict) base.verdict = verdict
    if (vertical) base.vertical = vertical
    if (claimType) base.claim_type = claimType
    // page defaults to 1 — omit it to keep URLs clean
    const merged = { ...base, ...overrides }
    // Remove undefined/empty keys
    return Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined && v !== ''),
    ) as Record<string, string>
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setParams(buildParams({ q: inputValue.trim() || undefined, page: undefined }))
  }

  const setFilter = useCallback(
    (key: string, value: string) => {
      setParams(buildParams({ [key]: value || undefined, page: undefined }))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, verdict, vertical, claimType],
  )

  function clearFilter(key: string) {
    setParams(buildParams({ [key]: undefined, page: undefined }))
  }

  function goToPage(p: number) {
    setParams(buildParams({ page: p > 1 ? String(p) : undefined }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const activeFilters = [
    verdict && { key: 'verdict', label: verdict },
    vertical && { key: 'vertical', label: domainLabel(vertical) },
    claimType && {
      key: 'claim_type',
      label: CLAIM_TYPES.find((t) => t.value === claimType)?.label ?? claimType,
    },
  ].filter(Boolean) as { key: string; label: string }[]

  const totalPages = data?.total_pages ?? 0
  const total = data?.total ?? 0

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ── */}
      <div className="border-b border-slate-100 bg-slate-50 py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1
                className="text-lg font-bold text-slate-900 leading-tight"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                Claim Registry
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {total > 0 ? (
                  <>
                    <span className="font-semibold text-slate-700">{total.toLocaleString()}</span>{' '}
                    verified claims across all research verticals
                  </>
                ) : (
                  'All verified claims across research verticals'
                )}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search claims, proteins, organisms, methods…"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent placeholder:text-slate-400 text-slate-900"
                autoFocus
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('')
                    setParams(buildParams({ q: undefined, page: undefined }))
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((f) => !f)}
              className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                showFilters || activeFilters.length > 0
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              aria-label="Toggle filters"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className="bg-white text-slate-900 rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                  {activeFilters.length}
                </span>
              )}
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-5">
              {/* Verdict filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Verdict
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VERDICTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFilter('verdict', verdict === v ? '' : v)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        verdict === v
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domain filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Domain
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DOMAINS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFilter('vertical', vertical === d ? '' : d)}
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        vertical === d
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {domainLabel(d)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Claim type filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Claim Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CLAIM_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() =>
                        setFilter('claim_type', claimType === t.value ? '' : t.value)
                      }
                      className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-colors ${
                        claimType === t.value
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => clearFilter(f.key)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-full font-medium hover:bg-slate-700 transition-colors"
                >
                  {f.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                onClick={() =>
                  setParams(
                    buildParams({
                      verdict: undefined,
                      vertical: undefined,
                      claim_type: undefined,
                      page: undefined,
                    }),
                  )
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium hover:bg-slate-200 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="text-center py-20">
            <p className="text-sm text-red-500">Failed to load registry. Please try again.</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && data && (
          <>
            {/* Result count + pagination info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {q ? (
                  <>
                    <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>{' '}
                    claims for{' '}
                    <span className="font-semibold text-slate-900">"{q}"</span>
                  </>
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-slate-900">
                      {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–
                      {Math.min(page * PAGE_SIZE, total).toLocaleString()}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>{' '}
                    claims
                  </>
                )}
              </p>
              {isFetching && !isLoading && (
                <span className="text-xs text-slate-400 animate-pulse">Updating…</span>
              )}
            </div>

            {/* Empty state */}
            {data.claims.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Database className="w-10 h-10 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No claims match these filters.</p>
                <button
                  onClick={() =>
                    setParams(
                      buildParams({
                        q: undefined,
                        verdict: undefined,
                        vertical: undefined,
                        claim_type: undefined,
                        page: undefined,
                      }),
                    )
                  }
                  className="mt-3 text-xs text-slate-500 underline hover:text-slate-700"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.claims.map((claim) => (
                  <RegistryClaimRow key={claim.id} claim={claim} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <PaginationNumbers
                  page={page}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Registry claim row ───────────────────────────────────────────────────────

function RegistryClaimRow({ claim }: { claim: import('@/lib/api').PublicClaim }) {
  const conf = claim.confidence_score
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        {/* Left: verdict + confidence */}
        <div className="flex flex-col items-start gap-1.5 shrink-0 pt-0.5">
          <VerdictBadge verdict={claim.verdict} />
          {conf !== null && (
            <span className={`text-xs font-mono font-medium ${confidenceColor(conf)}`}>
              {(conf * 100).toFixed(0)}%{' '}
              <span className="text-slate-400 font-normal">{confidenceLabel(conf)}</span>
            </span>
          )}
        </div>

        {/* Right: claim text + meta */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/claims/${claim.claim_id}`}
            className="block text-sm text-slate-800 leading-relaxed mb-2 group-hover:text-slate-900 hover:underline decoration-slate-300 underline-offset-2"
          >
            {truncate(claim.claim_text, 300)}
          </Link>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {/* Document */}
            <span className="flex items-center gap-1 min-w-0">
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
              <span className="truncate max-w-xs">{truncate(claim.document_title, 70)}</span>
            </span>

            {/* Domain badge */}
            <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
              {domainLabel(claim.vertical_domain)}
            </span>

            {/* Claim type badge */}
            <span className="shrink-0 px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-xs border border-slate-100">
              {claim.claim_type.replace(/_/g, ' ')}
            </span>

            {/* Detail link */}
            <Link
              to={`/claims/${claim.claim_id}`}
              className="shrink-0 flex items-center gap-0.5 text-slate-400 hover:text-slate-700 transition-colors ml-auto"
              aria-label="View claim detail"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Detail</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Pagination numbers ───────────────────────────────────────────────────────

function PaginationNumbers({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  // Build a window of page numbers around the current page
  const pages: (number | '…')[] = []
  const delta = 2

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div className="flex items-center gap-1">
      {pages.map((p, idx) =>
        p === '…' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-sm rounded-lg font-medium transition-colors ${
              p === page
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}
    </div>
  )
}
