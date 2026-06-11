/**
 * /rss.xml — RSS 2.0 feed of recently verified scientific claims.
 *
 * Fetches the latest claims from the registry API and renders them
 * as an RSS feed. Agents and aggregators that follow feeds pick up
 * new content automatically.
 *
 * Cached for 10 minutes.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = 'https://ttruthdesk.claims'

let cache: { body: string; generatedAt: number } | null = null
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function renderItem(claim: Claim): string {
  const text = claim.claim_text ?? claim.claimText ?? '(no text)'
  const verdict = claim.verdict ?? 'UNVERIFIED'
  const id = claim.id ?? ''
  const sourceTitle = claim.source_title ?? claim.sourceTitle ?? ''
  const sourceUrl = claim.source_url ?? claim.sourceUrl ?? ''
  const createdAt = claim.created_at ?? claim.createdAt ?? new Date().toISOString()
  const vertical = claim.vertical ?? 'General'
  const entities = (claim.entities ?? [])
    .map((e) => e.name ?? '')
    .filter(Boolean)
    .join(', ')

  const link = `https://citation.is/claims/${id}`
  const pubDate = new Date(createdAt).toUTCString()
  const description = [
    `Verdict: ${verdict}`,
    sourceTitle ? `Source: ${sourceTitle}` : '',
    entities ? `Entities: ${entities}` : '',
    `Vertical: ${vertical}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return `    <item>
      <title>${escapeXml(`[${verdict}] ${text.slice(0, 100)}${text.length > 100 ? '…' : ''}`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(description)}</description>
      ${sourceUrl ? `<source url="${escapeXml(sourceUrl)}">${escapeXml(sourceTitle || sourceUrl)}</source>` : ''}
      <category>${escapeXml(vertical)}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`
}

async function buildRss(): Promise<string> {
  const url = `${UPSTREAM_BASE}/api/public/claims.json`
  const upstream = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`)

  const data = await upstream.json() as unknown
  let claims: Claim[] = []
  if (Array.isArray(data)) {
    claims = data as Claim[]
  } else if (data && typeof data === 'object' && 'claims' in data && Array.isArray((data as { claims: unknown }).claims)) {
    claims = (data as { claims: Claim[] }).claims
  }

  // Sort by created_at descending so we get the 50 most recently verified claims
  claims.sort((a, b) => {
    const ta = new Date(a.created_at ?? a.createdAt ?? 0).getTime()
    const tb = new Date(b.created_at ?? b.createdAt ?? 0).getTime()
    return tb - ta
  })
  const recent = claims.slice(0, 50)
  const now = new Date().toUTCString()

  const items = recent.map(renderItem).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>citation.is — Verified Scientific Claims</title>
    <link>https://citation.is/</link>
    <description>Open registry of verified scientific claims. Every claim is cross-referenced against UniProt, PubChem, NCBI Taxonomy, and PubMed. CC BY 4.0.</description>
    <language>en</language>
    <copyright>CC BY 4.0 https://creativecommons.org/licenses/by/4.0/</copyright>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://citation.is/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://citation.is/favicon.ico</url>
      <title>citation.is</title>
      <link>https://citation.is/</link>
    </image>
    <category>Science</category>
    <category>Research</category>
    <category>Open Data</category>
${items}
  </channel>
</rss>`
}

export function registerRssFeed(app: Express): void {
  app.get('/rss.xml', async (_req: Request, res: Response) => {
    try {
      if (cache && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
        return res
          .status(200)
          .set('Content-Type', 'application/rss+xml; charset=utf-8')
          .set('Cache-Control', 'public, max-age=600')
          .send(cache.body)
      }

      const body = await buildRss()
      cache = { body, generatedAt: Date.now() }

      return res
        .status(200)
        .set('Content-Type', 'application/rss+xml; charset=utf-8')
        .set('Cache-Control', 'public, max-age=600')
        .send(body)
    } catch (err) {
      console.error('[RssFeed] Error building rss.xml:', err)
      if (cache) {
        return res
          .status(200)
          .set('Content-Type', 'application/rss+xml; charset=utf-8')
          .send(cache.body)
      }
      res.status(503).send('<?xml version="1.0"?><rss version="2.0"><channel><title>citation.is</title></channel></rss>')
    }
  })

  console.log('[RssFeed] /rss.xml endpoint registered')
}
