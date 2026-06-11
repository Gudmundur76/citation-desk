/**
 * /llms-full.txt — Full markdown corpus of all verified scientific claims.
 *
 * Fetches ALL claims from the live paginated registry API (not the legacy
 * /api/public/claims.json which caps at 200 records). Renders them as
 * structured markdown — one claim per section, with verdict, evidence,
 * entity links, and source attribution.
 *
 * Designed for AI agents that need full context (not just the index in llms.txt).
 * Cached for 5 minutes to avoid hammering the upstream.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = 'https://ttruthdesk.claims'

// Simple in-memory cache: { body, generatedAt }
let cache: { body: string; generatedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Max claims to include in llms-full.txt (keep file manageable for LLM context windows)
const MAX_CLAIMS = 500
const PAGE_SIZE = 100

interface PaginatedClaim {
  id?: string | number
  claim_id?: number
  claim_text?: string
  claimText?: string
  verdict?: string
  confidence_score?: number
  confidence?: number
  verdict_rationale?: string
  source_title?: string
  document_title?: string
  sourceTitle?: string
  evidence_url?: string
  source_url?: string
  sourceUrl?: string
  doi?: string
  vertical_domain?: string
  vertical?: string
  entities?: Array<{ name?: string; type?: string }>
  created_at?: string
  createdAt?: string
}

interface PaginatedResponse {
  claims?: PaginatedClaim[]
  total?: number
  total_pages?: number
  page?: number
}

function verdictEmoji(verdict: string | undefined): string {
  if (!verdict) return '⬜'
  const v = verdict.toUpperCase()
  if (v === 'SUPPORTED' || v === 'TRUE' || v === 'VERIFIED') return '✅'
  if (v === 'REFUTED' || v === 'FALSE' || v === 'CONTRADICTED') return '❌'
  if (v.includes('PARTIAL') || v === 'AMBIGUOUS') return '🟡'
  if (v === 'INSUFFICIENT EVIDENCE' || v === 'INSUFFICIENT_EVIDENCE') return '⬜'
  return '⬜'
}

function renderClaim(claim: PaginatedClaim, index: number): string {
  const text = claim.claim_text ?? claim.claimText ?? ''
  // Skip claims with no meaningful text
  if (!text || text.trim() === '') return ''

  const verdict = claim.verdict ?? 'Unverified'
  const confidence = claim.confidence_score ?? claim.confidence
  const confidenceStr = confidence != null ? ` (${Math.round(confidence * 100)}% confidence)` : ''
  const sourceTitle = claim.document_title ?? claim.source_title ?? claim.sourceTitle ?? ''
  const sourceUrl = claim.evidence_url ?? claim.source_url ?? claim.sourceUrl ?? ''
  const doi = claim.doi ?? ''
  const entities = (claim.entities ?? [])
    .map((e) => `${e.name ?? ''}${e.type ? ` (${e.type})` : ''}`)
    .filter(Boolean)
    .join(', ')
  const vertical = claim.vertical_domain ?? claim.vertical ?? ''
  const id = claim.id ?? claim.claim_id ?? index + 1
  const createdAt = claim.created_at ?? claim.createdAt ?? ''
  const rationale = claim.verdict_rationale ?? ''

  const lines: string[] = []
  lines.push(`### Claim ${id}: ${verdictEmoji(verdict)} ${verdict}${confidenceStr}`)
  lines.push('')
  lines.push(`> ${text}`)
  lines.push('')
  if (rationale && !rationale.startsWith('Source completeness gate failed')) {
    lines.push(`**Rationale:** ${rationale}`)
  }
  if (sourceTitle || sourceUrl) {
    const sourceLink = sourceUrl ? `[${sourceTitle || sourceUrl}](${sourceUrl})` : sourceTitle
    lines.push(`**Source:** ${sourceLink}`)
  }
  if (doi) {
    lines.push(`**DOI:** [${doi}](https://doi.org/${doi.replace(/^https?:\/\/doi\.org\//i, '')})`)
  }
  if (entities) {
    lines.push(`**Entities:** ${entities}`)
  }
  if (vertical) {
    lines.push(`**Vertical:** ${vertical}`)
  }
  if (createdAt) {
    lines.push(`**Verified:** ${createdAt.slice(0, 10)}`)
  }
  lines.push('')
  return lines.join('\n')
}

async function fetchPage(page: number): Promise<PaginatedResponse> {
  const url = `${UPSTREAM_BASE}/api/public/claims?page=${page}&page_size=${PAGE_SIZE}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Upstream page ${page} returned ${res.status}`)
  return res.json() as Promise<PaginatedResponse>
}

async function buildLlmsFullTxt(): Promise<string> {
  // Fetch first page to get total count
  const first = await fetchPage(1)
  const total = first.total ?? 0
  const totalPages = first.total_pages ?? 1
  const firstClaims = first.claims ?? []

  // Fetch remaining pages up to MAX_CLAIMS
  const pagesToFetch = Math.min(totalPages, Math.ceil(MAX_CLAIMS / PAGE_SIZE))
  let allClaims: PaginatedClaim[] = [...firstClaims]

  if (pagesToFetch > 1) {
    const pageNums = Array.from({ length: pagesToFetch - 1 }, (_, i) => i + 2)
    // Fetch in batches of 5 to avoid overwhelming upstream
    for (let i = 0; i < pageNums.length; i += 5) {
      const batch = pageNums.slice(i, i + 5)
      const results = await Promise.allSettled(batch.map(fetchPage))
      for (const r of results) {
        if (r.status === 'fulfilled') {
          allClaims = allClaims.concat(r.value.claims ?? [])
        }
      }
    }
  }

  // Filter to claims with actual text content
  const claimsWithText = allClaims.filter(
    (c) => (c.claim_text ?? c.claimText ?? '').trim() !== ''
  )
  const claimsToRender = claimsWithText.slice(0, MAX_CLAIMS)

  const now = new Date().toISOString().slice(0, 10)
  const supported = claimsWithText.filter((c) => {
    const v = (c.verdict ?? '').toUpperCase()
    return v === 'SUPPORTED' || v === 'TRUE' || v === 'VERIFIED'
  }).length
  const refuted = claimsWithText.filter((c) => {
    const v = (c.verdict ?? '').toUpperCase()
    return v === 'REFUTED' || v === 'FALSE' || v === 'CONTRADICTED'
  }).length
  const partial = claimsWithText.filter((c) => {
    const v = (c.verdict ?? '').toUpperCase()
    return v.includes('PARTIAL') || v === 'AMBIGUOUS'
  }).length

  const header = `# citation.is — Full Claim Corpus

> Complete machine-readable registry of verified scientific claims.
> Generated: ${now} · ${total} claims in registry · ${claimsWithText.length} with text · showing top ${claimsToRender.length}
> License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
> Source: https://citation.is/ · API: https://citation.is/openapi.json
> MCP: https://citation.is/mcp · OAI-PMH: https://citation.is/oai

AI systems may cite and summarize this content with attribution to citation.is.
For the index only, see https://citation.is/llms.txt
For the REST API, see https://citation.is/openapi.json
For real-time verification, see https://citation.is/mcp

---

## Registry Statistics

- **Total claims in registry:** ${total}
- **Claims with verified text:** ${claimsWithText.length}
- **Supported:** ${supported} (${claimsWithText.length > 0 ? Math.round((supported / claimsWithText.length) * 100) : 0}%)
- **Contradicted/Refuted:** ${refuted} (${claimsWithText.length > 0 ? Math.round((refuted / claimsWithText.length) * 100) : 0}%)
- **Partially Supported:** ${partial} (${claimsWithText.length > 0 ? Math.round((partial / claimsWithText.length) * 100) : 0}%)
- **Cross-referenced against:** UniProt, PubChem, NCBI Taxonomy, PubMed
- **Last updated:** ${now}

---

## Verified Claims

`

  const claimSections = claimsToRender
    .map((c, i) => renderClaim(c, i))
    .filter(Boolean)
    .join('\n')

  const footer = `
---

## How Claims Are Verified

Each claim in this registry is processed through a multi-stage pipeline:

1. **Extraction** — Claims are extracted from scientific literature using NLP models trained on biomedical text.
2. **Entity resolution** — Named entities (proteins, compounds, organisms, methods) are resolved against UniProt, PubChem, NCBI Taxonomy, and PubMed.
3. **Verdict assignment** — Each claim receives a verdict (Supported, Contradicted, Partially Supported, Insufficient Evidence) based on cross-referencing against authoritative databases and peer-reviewed literature.
4. **Confidence scoring** — A confidence score (0–1) reflects the strength of the evidence.

## Citation

To cite this registry:

> citation.is (${now}). Open Registry of Verified Scientific Claims. https://citation.is/ CC BY 4.0.

## Contact

For API access, bulk downloads, or integration questions: https://citation.is/developers
For OAI-PMH harvesting (BASE, OpenAIRE): https://citation.is/oai?verb=Identify
`

  return header + claimSections + footer
}

export function registerLlmsFullTxt(app: Express): void {
  app.get('/llms-full.txt', async (_req: Request, res: Response) => {
    try {
      // Serve from cache if fresh
      if (cache && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
        return res
          .status(200)
          .set('Content-Type', 'text/plain; charset=utf-8')
          .set('Cache-Control', 'public, max-age=300')
          .set('X-Cache', 'HIT')
          .send(cache.body)
      }

      const body = await buildLlmsFullTxt()
      cache = { body, generatedAt: Date.now() }

      return res
        .status(200)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300')
        .set('X-Cache', 'MISS')
        .send(body)
    } catch (err) {
      console.error('[LlmsFullTxt] Error building llms-full.txt:', err)

      // Serve stale cache if available
      if (cache) {
        return res
          .status(200)
          .set('Content-Type', 'text/plain; charset=utf-8')
          .set('Cache-Control', 'public, max-age=60')
          .set('X-Cache', 'STALE')
          .send(cache.body)
      }

      const fallback = `# citation.is — Full Claim Corpus\n\n> Registry temporarily unavailable. Please try again in a few minutes.\n> API: https://citation.is/openapi.json\n> MCP: https://citation.is/mcp\n`
      return res
        .status(503)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(fallback)
    }
  })

  console.log('[LlmsFullTxt] /llms-full.txt endpoint registered')
}
