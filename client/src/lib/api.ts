/**
 * API client for the ttruthdesk.claims backend.
 * All public tRPC procedures are called via GET with JSON-encoded input.
 * No auth required for public endpoints.
 */
const BASE = 'https://ttruthdesk.claims/api/trpc'

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
}
