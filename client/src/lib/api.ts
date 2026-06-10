/**
 * API client for the ttruthdesk.claims backend.
 * All public tRPC procedures are routed through the server-side proxy at
 * /api/external/trpc/* to avoid CORS and sandbox network restrictions.
 * The Express server forwards requests to https://ttruthdesk.claims/api/trpc.
 */
const BASE = '/api/external/trpc'
const PUBLIC_BASE = '/api/external/public'

function encode(input: unknown): string {
  return encodeURIComponent(JSON.stringify({ json: input }))
}

async function get<T>(procedure: string, input?: unknown): Promise<T> {
  const url =
    input !== undefined
      ? `${BASE}/${procedure}?input=${encode(input)}`
      : `${BASE}/${procedure}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error ${res.status} on ${procedure}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.json?.message ?? 'API error')
  return data.result.data.json as T
}

async function post<T>(procedure: string, input: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${procedure}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: input }),
  })
  if (!res.ok) throw new Error(`API error ${res.status} on ${procedure}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error.json?.message ?? 'API error')
  return data.result.data.json as T
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GlobalStats {
  totalDocuments: number
  totalClaims: number
  supportedVerdicts: number
  verifiedSources: number
}

export interface VerticalStat {
  domain: string
  totalDocs: number
  completedDocs: number
  totalClaims: number
  supportedClaims: number
}

export interface VerticalDetail {
  domainKey: string
  displayName: string
  description: string
  discoverySearchTerms: string[]
}

export interface ClaimResult {
  id: number
  claimText: string
  verdict: 'Supported' | 'Refuted' | 'Ambiguous' | 'Insufficient Evidence'
  confidenceScore: number
  documentId: number
  documentTitle: string
  verticalDomain: string
  relevanceScore?: number
}

export interface SearchResult {
  claims: ClaimResult[]
  entities: EntityResult[]
  count?: number
}

export interface EntityResult {
  id: number
  canonicalName: string
  entityType: string
  totalCitations?: number
}

export interface LeaderboardEntry {
  rank: number
  id: number
  canonicalName: string
  entityType: string
  totalCitations: number
  recentCitations: number
  trend: 'up' | 'down' | 'stable'
  trendDelta: number
}

export interface AuditRequestInput {
  tier: 'starter' | 'diligence' | 'platform_pilot'
  contactName: string
  contactEmail: string
  organization?: string
  documentDescription: string
  additionalNotes?: string
}

export interface GraphDocument {
  id: number
  title: string
  status: string
  verticalDomain: string
  createdAt: string
}

// ─── Public REST API types ────────────────────────────────────────────────────
// These map to the /api/public/* endpoints on ttruthdesk.claims.

export type PublicVerdict =
  | 'Supported'
  | 'Refuted'
  | 'Ambiguous'
  | 'Insufficient Evidence'
  | 'Out of Scope'

export interface PublicClaim {
  id: string                   // composite id e.g. "ptd-270001-300002"
  claim_id: number
  document_id: number
  document_title: string
  vertical_domain: string
  claim_text: string
  claim_type: string
  extracted_value: string | null
  pdb_id: string | null
  verdict: PublicVerdict
  verdict_rationale: string | null
  confidence_score: number | null
  verdict_method?: string
  evidence_url: string | null
  page_url: string
  audit_url: string
  created_at: string
  updated_at: string
}

export interface PublicClaimDetail extends PublicClaim {
  jsonld: unknown[]
}

export interface PublicClaimsPage {
  page: number
  page_size: number
  total: number
  total_pages: number
  filters: {
    verdict: string | null
    vertical: string | null
    claim_type: string | null
    updated_since: string | null
    q: string | null
  }
  claims: PublicClaim[]
}

export interface RegistryQuery {
  page?: number
  page_size?: number
  q?: string
  verdict?: string
  vertical?: string
  claim_type?: string
}

// ─── API calls ───────────────────────────────────────────────────────────────

export const api = {
  globalStats: () => get<GlobalStats>('verticals.globalStats'),
  verticalStats: () => get<VerticalStat[]>('verticals.stats', {}),
  verticalDetail: (domainKey: string) =>
    get<VerticalDetail>('verticals.detail', { domainKey }),
  verticalListAll: () => get<VerticalDetail[]>('verticals.listAll'),
  searchUnified: (query: string) =>
    get<SearchResult>('search.unified', { query }),
  searchClaims: (
    query: string,
    opts?: { verticalDomain?: string; verdict?: string; limit?: number },
  ) =>
    get<{ results: ClaimResult[]; count: number }>('search.claims', {
      query,
      limit: opts?.limit ?? 20,
      verticalDomain: opts?.verticalDomain,
      verdict: opts?.verdict,
    }),
  leaderboardTopEntities: (opts?: { verticalDomain?: string; limit?: number }) =>
    get<LeaderboardEntry[]>('leaderboard.topEntities', opts ?? {}),
  leaderboardVerticalSummary: () =>
    get<unknown>('leaderboard.verticalSummary', {}),
  graphData: (verticalDomain?: string) =>
    get<{ documents: GraphDocument[] }>(
      'graph.data',
      verticalDomain ? { verticalDomain } : {},
    ),
  graphCorpusGrowthStats: () => get<unknown>('graph.corpusGrowthStats', {}),
  timelineForClaim: (claimId: number) =>
    get<unknown>('timeline.forClaim', { claimId }),
  provenanceGetChain: (claimId: number) =>
    get<unknown>('provenance.getChain', { claimId }),
  similarityFindSimilar: (
    query: string,
    opts?: { verticalDomain?: string; limit?: number },
  ) => get<unknown>('similarity.findSimilar', { query, ...opts }),
  cooccurrenceTop: (opts?: { verticalDomain?: string; limit?: number }) =>
    get<unknown>('cooccurrence.top', opts ?? {}),
  submitAuditRequest: (input: AuditRequestInput) =>
    post<{ success: boolean; requestId: number }>('auditRequests.submit', input),

  // ─── Public REST API ───────────────────────────────────────────────────────────

  /**
   * Fetch a paginated list of verified claims from the public registry.
   * Supports filtering by verdict, vertical domain, claim type, and free-text query.
   */
  registryClaims: async (query: RegistryQuery = {}): Promise<PublicClaimsPage> => {
    const params = new URLSearchParams()
    if (query.page) params.set('page', String(query.page))
    if (query.page_size) params.set('page_size', String(query.page_size))
    if (query.q) params.set('q', query.q)
    if (query.verdict) params.set('verdict', query.verdict)
    if (query.vertical) params.set('vertical', query.vertical)
    if (query.claim_type) params.set('claim_type', query.claim_type)
    const qs = params.toString()
    const url = `${PUBLIC_BASE}/claims${qs ? '?' + qs : ''}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Registry API error ${res.status}`)
    return res.json() as Promise<PublicClaimsPage>
  },

  /**
   * Fetch a single claim by its numeric ID from the public registry.
   * Returns the full claim detail including JSON-LD structured data.
   * Throws if the claim is not found (404).
   */
  claimById: async (id: number): Promise<PublicClaimDetail> => {
    const url = `${PUBLIC_BASE}/claims/${id}`
    const res = await fetch(url)
    if (res.status === 404) throw new Error('Claim not found')
    if (!res.ok) throw new Error(`Claim API error ${res.status}`)
    return res.json() as Promise<PublicClaimDetail>
  },
}
