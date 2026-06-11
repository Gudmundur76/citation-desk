/**
 * Dynamic sitemap generator for citation.is.
 *
 * Serves three sitemap documents:
 *   /sitemap.xml           → Sitemap index referencing all sub-sitemaps
 *   /sitemap-pages.xml     → Static pages (core routes, OAI-PMH, data endpoints)
 *   /sitemap-claims.xml    → All claim detail pages (/claims/:id), fetched live
 *
 * Claims are fetched from the ttruthdesk.claims public REST API and cached for
 * 30 minutes (stale-while-revalidate pattern) so the sitemap stays fresh without
 * hammering the upstream on every crawler request.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = process.env.TTRUTHDESK_BASE_URL ?? 'https://ttruthdesk.claims'
const UPSTREAM_PUBLIC = `${UPSTREAM_BASE}/api/public`
const SITE_BASE = 'https://citation.is'

// ─── In-memory cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  xml: string
  fetchedAt: number
}

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

const cache: Record<string, CacheEntry> = {}

function getCached(key: string): string | null {
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null
  return entry.xml
}

function setCache(key: string, xml: string): void {
  cache[key] = { xml, fetchedAt: Date.now() }
}

// ─── XML helpers ──────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(loc: string, opts?: { changefreq?: string; priority?: string; lastmod?: string }): string {
  const lines = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`]
  if (opts?.lastmod) lines.push(`    <lastmod>${opts.lastmod}</lastmod>`)
  if (opts?.changefreq) lines.push(`    <changefreq>${opts.changefreq}</changefreq>`)
  if (opts?.priority) lines.push(`    <priority>${opts.priority}</priority>`)
  lines.push(`  </url>`)
  return lines.join('\n')
}

function sitemapDoc(entries: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
    '          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    '',
    ...entries,
    '',
    '</urlset>',
  ].join('\n')
}

function sitemapIndexDoc(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const entries = sitemaps.map(({ loc, lastmod }) => {
    const lines = [`  <sitemap>`, `    <loc>${escapeXml(loc)}</loc>`]
    if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`)
    lines.push(`  </sitemap>`)
    return lines.join('\n')
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '',
    ...entries,
    '',
    '</sitemapindex>',
  ].join('\n')
}

// ─── Static pages sitemap ─────────────────────────────────────────────────────

function buildPagesSitemap(): string {
  const entries = [
    urlEntry(`${SITE_BASE}/`,              { changefreq: 'daily',   priority: '1.0' }),
    urlEntry(`${SITE_BASE}/search`,        { changefreq: 'daily',   priority: '0.9' }),
    urlEntry(`${SITE_BASE}/registry`,      { changefreq: 'daily',   priority: '0.9' }),
    urlEntry(`${SITE_BASE}/verticals`,     { changefreq: 'weekly',  priority: '0.8' }),
    urlEntry(`${SITE_BASE}/leaderboard`,   { changefreq: 'weekly',  priority: '0.7' }),
    urlEntry(`${SITE_BASE}/developers`,    { changefreq: 'monthly', priority: '0.8' }),
    urlEntry(`${SITE_BASE}/about`,         { changefreq: 'monthly', priority: '0.6' }),
    urlEntry(`${SITE_BASE}/audit`,         { changefreq: 'monthly', priority: '0.6' }),
    urlEntry(`${SITE_BASE}/methodology`,   { changefreq: 'monthly', priority: '0.7' }),
    urlEntry(`${SITE_BASE}/contradictions`,{ changefreq: 'daily',   priority: '0.7' }),
    // Machine-readable endpoints
    urlEntry(`${SITE_BASE}/api/public/claims.json`,  { changefreq: 'daily',   priority: '0.9' }),
    urlEntry(`${SITE_BASE}/api/public/graph.json`,   { changefreq: 'weekly',  priority: '0.8' }),
    urlEntry(`${SITE_BASE}/openapi.json`,             { changefreq: 'monthly', priority: '0.7' }),
    urlEntry(`${SITE_BASE}/api/md`,                   { changefreq: 'daily',   priority: '0.7' }),
    urlEntry(`${SITE_BASE}/llms.txt`,                 { changefreq: 'daily',   priority: '0.7' }),
    urlEntry(`${SITE_BASE}/llms-full.txt`,            { changefreq: 'daily',   priority: '0.8' }),
    urlEntry(`${SITE_BASE}/rss.xml`,                  { changefreq: 'daily',   priority: '0.7' }),
    // OAI-PMH
    urlEntry(`${SITE_BASE}/oai?verb=Identify`,                                   { changefreq: 'monthly', priority: '0.6' }),
    urlEntry(`${SITE_BASE}/oai?verb=ListRecords&metadataPrefix=oai_dc`,          { changefreq: 'daily',   priority: '0.8' }),
    urlEntry(`${SITE_BASE}/oai?verb=ListRecords&metadataPrefix=datacite`,        { changefreq: 'daily',   priority: '0.8' }),
  ]
  return sitemapDoc(entries)
}

// ─── Claims sitemap (dynamic) ─────────────────────────────────────────────────

interface PublicClaimRow {
  claim_id: number
  updated_at: string
  verdict: string
}

interface PublicClaimsPage {
  page: number
  page_size: number
  total: number
  total_pages: number
  claims: PublicClaimRow[]
}

async function fetchAllClaimIds(): Promise<PublicClaimRow[]> {
  const PAGE_SIZE = 500
  const rows: PublicClaimRow[] = []

  // Fetch first page to get total count
  const firstUrl = `${UPSTREAM_PUBLIC}/claims?page=1&page_size=${PAGE_SIZE}`
  const firstRes = await fetch(firstUrl, { headers: { Accept: 'application/json' } })
  if (!firstRes.ok) throw new Error(`Upstream claims API returned ${firstRes.status}`)
  const firstPage = await firstRes.json() as PublicClaimsPage
  rows.push(...firstPage.claims)

  // Fetch remaining pages in parallel (cap at 20 pages = 10,000 claims)
  const totalPages = Math.min(firstPage.total_pages, 20)
  if (totalPages > 1) {
    const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
    const results = await Promise.allSettled(
      pageNums.map(async (page) => {
        const url = `${UPSTREAM_PUBLIC}/claims?page=${page}&page_size=${PAGE_SIZE}`
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!res.ok) return []
        const data = await res.json() as PublicClaimsPage
        return data.claims
      }),
    )
    for (const result of results) {
      if (result.status === 'fulfilled') rows.push(...result.value)
    }
  }

  return rows
}

async function buildClaimsSitemap(): Promise<string> {
  const cached = getCached('claims')
  if (cached) return cached

  let entries: string[]
  try {
    const claims = await fetchAllClaimIds()
    entries = claims.map((c) => {
      const lastmod = c.updated_at
        ? new Date(c.updated_at).toISOString().slice(0, 10)
        : undefined
      return urlEntry(`${SITE_BASE}/claims/${c.claim_id}`, {
        changefreq: 'weekly',
        priority: '0.8',
        lastmod,
      })
    })
  } catch (err) {
    console.error('[SitemapGenerator] Failed to fetch claims:', err)
    // Return a minimal fallback so the sitemap is still valid XML
    entries = [
      urlEntry(`${SITE_BASE}/registry`, { changefreq: 'daily', priority: '0.9' }),
    ]
  }

  const xml = sitemapDoc(entries)
  setCache('claims', xml)
  return xml
}

// ─── Sitemap index ────────────────────────────────────────────────────────────

function buildSitemapIndex(): string {
  const today = new Date().toISOString().slice(0, 10)
  return sitemapIndexDoc([
    { loc: `${SITE_BASE}/sitemap-pages.xml`,  lastmod: today },
    { loc: `${SITE_BASE}/sitemap-claims.xml`, lastmod: today },
  ])
}

// ─── Express registration ─────────────────────────────────────────────────────

export function registerSitemapGenerator(app: Express): void {
  const XML_CONTENT_TYPE = 'application/xml; charset=utf-8'
  const CACHE_HEADER = 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'

  // Sitemap index — replaces the static /sitemap.xml
  app.get('/sitemap.xml', (_req: Request, res: Response) => {
    res.set('Content-Type', XML_CONTENT_TYPE)
    res.set('Cache-Control', CACHE_HEADER)
    res.send(buildSitemapIndex())
  })

  // Static pages sub-sitemap
  app.get('/sitemap-pages.xml', (_req: Request, res: Response) => {
    res.set('Content-Type', XML_CONTENT_TYPE)
    res.set('Cache-Control', CACHE_HEADER)
    res.send(buildPagesSitemap())
  })

  // Dynamic claims sub-sitemap (async, cached 30 min)
  app.get('/sitemap-claims.xml', async (_req: Request, res: Response) => {
    try {
      const xml = await buildClaimsSitemap()
      res.set('Content-Type', XML_CONTENT_TYPE)
      res.set('Cache-Control', CACHE_HEADER)
      res.send(xml)
    } catch (err) {
      console.error('[SitemapGenerator] /sitemap-claims.xml error:', err)
      res.status(502).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')
    }
  })

  console.log('[SitemapGenerator] Mounted: /sitemap.xml (index), /sitemap-pages.xml, /sitemap-claims.xml')
}
