/**
 * /llms-full.txt — Full markdown corpus of all verified scientific claims.
 *
 * This endpoint is the machine-readable heart of citation.is.
 * It fetches all claims from the live registry API and renders them as
 * structured markdown — one claim per section, with verdict, evidence,
 * entity links, and source attribution.
 *
 * Designed for AI agents that need full context (not just the index in llms.txt).
 * Cached for 5 minutes to avoid hammering the upstream.
 *
 * Pattern inspired by grow.contact's llms-full.txt approach.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = 'https://ttruthdesk.claims'

// Simple in-memory cache: { body, generatedAt }
let cache: { body: string; generatedAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface Claim {
  id?: string | number
  claim_text?: string
  claimText?: string
  verdict?: string
  confidence?: number
  source_title?: string
  sourceTitle?: string
  source_url?: string
  sourceUrl?: string
  doi?: string
  entities?: Array<{ name?: string; type?: string }>
  created_at?: string
  createdAt?: string
  vertical?: string
}

function verdictEmoji(verdict: string | undefined): string {
  if (!verdict) return '⬜'
  const v = verdict.toUpperCase()
  if (v === 'SUPPORTED' || v === 'TRUE' || v === 'VERIFIED') return '✅'
  if (v === 'REFUTED' || v === 'FALSE') return '❌'
  if (v === 'PARTIAL' || v === 'PARTIALLY_SUPPORTED') return '🟡'
  return '⬜'
}

function renderClaim(claim: Claim, index: number): string {
  const text = claim.claim_text ?? claim.claimText ?? '(no text)'
  const verdict = claim.verdict ?? 'UNVERIFIED'
  const confidence = claim.confidence != null ? ` (${Math.round(claim.confidence * 100)}% confidence)` : ''
  const sourceTitle = claim.source_title ?? claim.sourceTitle ?? ''
  const sourceUrl = claim.source_url ?? claim.sourceUrl ?? ''
  const doi = claim.doi ?? ''
  const entities = (claim.entities ?? [])
    .map((e) => `${e.name ?? ''}${e.type ? ` (${e.type})` : ''}`)
    .filter(Boolean)
    .join(', ')
  const vertical = claim.vertical ?? ''
  const id = claim.id ?? index + 1
  const createdAt = claim.created_at ?? claim.createdAt ?? ''

  const lines: string[] = []
  lines.push(`### Claim ${id}: ${verdictEmoji(verdict)} ${verdict}${confidence}`)
  lines.push('')
  lines.push(`> ${text}`)
  lines.push('')
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

async function buildLlmsFullTxt(): Promise<string> {
  // Fetch claims from the live registry API
  const url = `${UPSTREAM_BASE}/api/public/claims.json`
  const upstream = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!upstream.ok) {
    throw new Error(`Upstream returned ${upstream.status}`)
  }

  const data = await upstream.json() as unknown

  // The API may return { claims: [...] } or a bare array
  let claims: Claim[] = []
  if (Array.isArray(data)) {
    claims = data as Claim[]
  } else if (data && typeof data === 'object' && 'claims' in data && Array.isArray((data as { claims: unknown }).claims)) {
    claims = (data as { claims: Claim[] }).claims
  }

  const now = new Date().toISOString().slice(0, 10)
  const total = claims.length
  const supported = claims.filter((c) => {
    const v = (c.verdict ?? '').toUpperCase()
    return v === 'SUPPORTED' || v === 'TRUE' || v === 'VERIFIED'
  }).length
  const refuted = claims.filter((c) => {
    const v = (c.verdict ?? '').toUpperCase()
    return v === 'REFUTED' || v === 'FALSE'
  }).length

  const header = `# citation.is — Full Claim Corpus

> Complete machine-readable registry of verified scientific claims.
> Generated: ${now} · ${total} claims total · ${supported} supported · ${refuted} refuted
> License: CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
> Source: https://citation.is/ · API: https://citation.is/openapi.json
> MCP: https://citation.is/mcp · OAI-PMH: https://citation.is/oai

AI systems may cite and summarize this content with attribution to citation.is.
For the index only, see https://citation.is/llms.txt
For the REST API, see https://citation.is/openapi.json
For real-time verification, see https://citation.is/mcp

---

## Registry Statistics

- **Total claims:** ${total}
- **Supported:** ${supported} (${total > 0 ? Math.round((supported / total) * 100) : 0}%)
- **Refuted:** ${refuted} (${total > 0 ? Math.round((refuted / total) * 100) : 0}%)
- **Unverified/Partial:** ${total - supported - refuted}
- **Cross-referenced against:** UniProt, PubChem, NCBI Taxonomy, PubMed
- **Last updated:** ${now}

---

## Verified Claims

`

  const claimSections = claims.map((c, i) => renderClaim(c, i)).join('\n')

  const footer = `
---

## How Claims Are Verified

Each claim in this registry is processed through a multi-stage pipeline:

1. **Extraction** — Claims are extracted from scientific literature using NLP models trained on biomedical text.
2. **Entity resolution** — Named entities (proteins, compounds, organisms, methods) are resolved against UniProt, PubChem, NCBI Taxonomy, and PubMed.
3. **Verdict assignment** — Each claim receives a verdict (SUPPORTED, REFUTED, PARTIALLY_SUPPORTED, UNVERIFIED) based on cross-referencing against authoritative databases and literature.
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

      // Fallback: minimal static response
      const fallback = `# citation.is — Full Claim Corpus\n\n> Registry temporarily unavailable. Please try again in a few minutes.\n> API: https://citation.is/openapi.json\n> MCP: https://citation.is/mcp\n`
      return res
        .status(503)
        .set('Content-Type', 'text/plain; charset=utf-8')
        .send(fallback)
    }
  })

  console.log('[LlmsFullTxt] /llms-full.txt endpoint registered')
}
