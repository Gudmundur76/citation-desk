/**
 * OAI-PMH 2.0 endpoint for citation.is
 *
 * Implements the six required OAI-PMH verbs:
 *   Identify, ListMetadataFormats, ListSets, ListIdentifiers, ListRecords, GetRecord
 *
 * Metadata formats supported:
 *   - oai_dc  (Dublin Core — required by OAI-PMH spec)
 *   - datacite (DataCite Metadata Schema 4.x — required by OpenAIRE Guidelines for Data Archives)
 *
 * Records are fetched from the citation.manus.space public API and mapped to
 * the appropriate XML schema on the fly. No local DB is required.
 *
 * Registration targets:
 *   - BASE (Bielefeld Academic Search Engine) — harvests via OAI-PMH
 *   - OpenAIRE — requires DataCite metadataPrefix + re3data registration first
 *
 * Spec: https://www.openarchives.org/OAI/openarchivesprotocol.html
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM_BASE = 'https://citation.manus.space'
const REPOSITORY_NAME = 'citation.is — Verified Scientific Claims Registry'
const BASE_URL = 'https://citation.is/oai'
const ADMIN_EMAIL = 'admin@citation.is'
const EARLIEST_DATESTAMP = '2024-01-01T00:00:00Z'
const REPOSITORY_IDENTIFIER = 'citation.is'
const SAMPLE_IDENTIFIER_PREFIX = `oai:${REPOSITORY_IDENTIFIER}:`

// ─── XML helpers ──────────────────────────────────────────────────────────────

function xmlHeader() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
}

function oaiEnvelope(verb: string, requestAttrs: string, inner: string) {
  const now = new Date().toISOString()
  return `${xmlHeader()}<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${now}</responseDate>
  <request verb="${verb}" ${requestAttrs}>${BASE_URL}</request>
  ${inner}
</OAI-PMH>`
}

function oaiError(code: string, message: string, verb = '') {
  return oaiEnvelope(verb, ``, `<error code="${code}">${escXml(message)}</error>`)
}

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ─── Upstream data helpers ────────────────────────────────────────────────────

interface UpstreamClaim {
  id: string
  claim_id: number
  document_id: number
  document_title: string
  vertical_domain: string | null
  claim_text: string
  verdict: string
  confidence_score: number | null
  evidence_url: string | null
  page_url: string
  audit_url: string
  created_at?: string
}

async function fetchClaims(page: number, pageSize: number): Promise<{ claims: UpstreamClaim[]; total: number }> {
  const url = `${UPSTREAM_BASE}/api/public/claims?page=${page}&page_size=${pageSize}`
  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!resp.ok) throw new Error(`Upstream ${resp.status}`)
  return resp.json() as Promise<{ claims: UpstreamClaim[]; total: number }>
}

async function fetchClaim(claimId: number): Promise<UpstreamClaim | null> {
  const url = `${UPSTREAM_BASE}/api/public/claims/${claimId}`
  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  if (resp.status === 404) return null
  if (!resp.ok) throw new Error(`Upstream ${resp.status}`)
  return resp.json() as Promise<UpstreamClaim>
}

// ─── Metadata serialisers ─────────────────────────────────────────────────────

function claimToDublinCore(c: UpstreamClaim): string {
  const date = c.created_at ? c.created_at.slice(0, 10) : EARLIEST_DATESTAMP.slice(0, 10)
  return `<oai_dc:dc
    xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
  <dc:title>${escXml(c.claim_text.slice(0, 200))}</dc:title>
  <dc:description>${escXml(c.claim_text)}</dc:description>
  <dc:type>Dataset</dc:type>
  <dc:type>ScientificClaim</dc:type>
  <dc:identifier>${escXml(c.page_url)}</dc:identifier>
  <dc:source>${escXml(c.document_title)}</dc:source>
  <dc:subject>${escXml(c.vertical_domain ?? 'life_sciences')}</dc:subject>
  <dc:date>${escXml(date)}</dc:date>
  <dc:rights>CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/</dc:rights>
  <dc:publisher>citation.is</dc:publisher>
  <dc:language>en</dc:language>
  <dc:relation>${escXml(c.audit_url)}</dc:relation>${c.evidence_url ? `\n  <dc:relation>${escXml(c.evidence_url)}</dc:relation>` : ''}
</oai_dc:dc>`
}

function claimToDataCite(c: UpstreamClaim): string {
  const year = c.created_at ? c.created_at.slice(0, 4) : '2024'
  const doi = `10.0000/citation.is.claim.${c.claim_id}` // placeholder — replace with real DOI if minted
  return `<resource xmlns="http://datacite.org/schema/kernel-4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://datacite.org/schema/kernel-4 https://schema.datacite.org/meta/kernel-4/metadata.xsd">
  <identifier identifierType="DOI">${escXml(doi)}</identifier>
  <creators>
    <creator>
      <creatorName nameType="Organizational">citation.is</creatorName>
    </creator>
  </creators>
  <titles>
    <title>${escXml(c.claim_text.slice(0, 200))}</title>
  </titles>
  <publisher>citation.is</publisher>
  <publicationYear>${escXml(year)}</publicationYear>
  <resourceType resourceTypeGeneral="Dataset">ScientificClaim</resourceType>
  <subjects>
    <subject>${escXml(c.vertical_domain ?? 'life_sciences')}</subject>
    <subject>${escXml(c.verdict)}</subject>
  </subjects>
  <descriptions>
    <description descriptionType="Abstract">${escXml(c.claim_text)}</description>
    <description descriptionType="Other">Source document: ${escXml(c.document_title)}</description>
  </descriptions>
  <rightsList>
    <rights rightsURI="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</rights>
  </rightsList>
  <relatedIdentifiers>
    <relatedIdentifier relatedIdentifierType="URL" relationType="IsPartOf">${escXml(c.audit_url)}</relatedIdentifier>${c.evidence_url ? `\n    <relatedIdentifier relatedIdentifierType="URL" relationType="IsSupplementedBy">${escXml(c.evidence_url)}</relatedIdentifier>` : ''}
  </relatedIdentifiers>
</resource>`
}

function claimToRecord(c: UpstreamClaim, metadataPrefix: string): string {
  const oaiId = `${SAMPLE_IDENTIFIER_PREFIX}claim.${c.claim_id}`
  const date = c.created_at ? c.created_at.slice(0, 10) : EARLIEST_DATESTAMP.slice(0, 10)
  const metadata =
    metadataPrefix === 'datacite'
      ? claimToDataCite(c)
      : claimToDublinCore(c)
  return `<record>
  <header>
    <identifier>${escXml(oaiId)}</identifier>
    <datestamp>${escXml(date)}</datestamp>
    <setSpec>claims</setSpec>
    <setSpec>${escXml(c.vertical_domain ?? 'other')}</setSpec>
  </header>
  <metadata>
    ${metadata}
  </metadata>
</record>`
}

// ─── Verb handlers ────────────────────────────────────────────────────────────

function handleIdentify(req: Request, res: Response) {
  const inner = `<Identify>
  <repositoryName>${escXml(REPOSITORY_NAME)}</repositoryName>
  <baseURL>${escXml(BASE_URL)}</baseURL>
  <protocolVersion>2.0</protocolVersion>
  <adminEmail>${escXml(ADMIN_EMAIL)}</adminEmail>
  <earliestDatestamp>${EARLIEST_DATESTAMP}</earliestDatestamp>
  <deletedRecord>no</deletedRecord>
  <granularity>YYYY-MM-DD</granularity>
  <description>
    <oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">
      <scheme>oai</scheme>
      <repositoryIdentifier>${escXml(REPOSITORY_IDENTIFIER)}</repositoryIdentifier>
      <delimiter>:</delimiter>
      <sampleIdentifier>${escXml(SAMPLE_IDENTIFIER_PREFIX)}claim.1</sampleIdentifier>
    </oai-identifier>
  </description>
</Identify>`
  res.set('Content-Type', 'text/xml; charset=utf-8')
  res.send(oaiEnvelope('Identify', '', inner))
}

function handleListMetadataFormats(req: Request, res: Response) {
  const inner = `<ListMetadataFormats>
  <metadataFormat>
    <metadataPrefix>oai_dc</metadataPrefix>
    <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
    <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
  </metadataFormat>
  <metadataFormat>
    <metadataPrefix>datacite</metadataPrefix>
    <schema>https://schema.datacite.org/meta/kernel-4/metadata.xsd</schema>
    <metadataNamespace>http://datacite.org/schema/kernel-4</metadataNamespace>
  </metadataFormat>
</ListMetadataFormats>`
  res.set('Content-Type', 'text/xml; charset=utf-8')
  res.send(oaiEnvelope('ListMetadataFormats', '', inner))
}

function handleListSets(req: Request, res: Response) {
  const inner = `<ListSets>
  <set>
    <setSpec>claims</setSpec>
    <setName>All Verified Claims</setName>
  </set>
  <set>
    <setSpec>structural_biology</setSpec>
    <setName>Structural Biology Claims</setName>
  </set>
  <set>
    <setSpec>salmon_biotech</setSpec>
    <setName>Salmon Biotechnology Claims</setName>
  </set>
  <set>
    <setSpec>genomics</setSpec>
    <setName>Genomics Claims</setName>
  </set>
  <set>
    <setSpec>clinical_trials</setSpec>
    <setName>Clinical Trials Claims</setName>
  </set>
  <set>
    <setSpec>nutrition</setSpec>
    <setName>Nutrition Science Claims</setName>
  </set>
</ListSets>`
  res.set('Content-Type', 'text/xml; charset=utf-8')
  res.send(oaiEnvelope('ListSets', '', inner))
}

async function handleListIdentifiers(req: Request, res: Response) {
  const metadataPrefix = (req.query.metadataPrefix as string) ?? 'oai_dc'
  if (!['oai_dc', 'datacite'].includes(metadataPrefix)) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    return res.send(oaiError('cannotDisseminateFormat', `Unsupported metadataPrefix: ${metadataPrefix}`, 'ListIdentifiers'))
  }
  try {
    const { claims } = await fetchClaims(1, 100)
    const headers = claims.map(c => {
      const oaiId = `${SAMPLE_IDENTIFIER_PREFIX}claim.${c.claim_id}`
      const date = c.created_at ? c.created_at.slice(0, 10) : EARLIEST_DATESTAMP.slice(0, 10)
      return `<header>
    <identifier>${escXml(oaiId)}</identifier>
    <datestamp>${escXml(date)}</datestamp>
    <setSpec>claims</setSpec>${c.vertical_domain ? `\n    <setSpec>${escXml(c.vertical_domain)}</setSpec>` : ''}
  </header>`
    }).join('\n  ')
    const inner = `<ListIdentifiers>\n  ${headers}\n</ListIdentifiers>`
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.send(oaiEnvelope('ListIdentifiers', `metadataPrefix="${metadataPrefix}"`, inner))
  } catch (err) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.send(oaiError('badArgument', `Upstream error: ${String(err)}`, 'ListIdentifiers'))
  }
}

async function handleListRecords(req: Request, res: Response) {
  const metadataPrefix = (req.query.metadataPrefix as string) ?? 'oai_dc'
  if (!['oai_dc', 'datacite'].includes(metadataPrefix)) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    return res.send(oaiError('cannotDisseminateFormat', `Unsupported metadataPrefix: ${metadataPrefix}`, 'ListRecords'))
  }
  try {
    const { claims } = await fetchClaims(1, 50)
    const records = claims.map(c => claimToRecord(c, metadataPrefix)).join('\n  ')
    const inner = `<ListRecords>\n  ${records}\n</ListRecords>`
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.send(oaiEnvelope('ListRecords', `metadataPrefix="${metadataPrefix}"`, inner))
  } catch (err) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.send(oaiError('badArgument', `Upstream error: ${String(err)}`, 'ListRecords'))
  }
}

async function handleGetRecord(req: Request, res: Response) {
  const identifier = req.query.identifier as string
  const metadataPrefix = (req.query.metadataPrefix as string) ?? 'oai_dc'
  if (!identifier) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    return res.send(oaiError('badArgument', 'Missing identifier', 'GetRecord'))
  }
  if (!['oai_dc', 'datacite'].includes(metadataPrefix)) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    return res.send(oaiError('cannotDisseminateFormat', `Unsupported metadataPrefix: ${metadataPrefix}`, 'GetRecord'))
  }
  // Parse claim ID from oai:citation.is:claim.<id>
  const match = identifier.match(/claim\.(\d+)$/)
  if (!match) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    return res.send(oaiError('idDoesNotExist', `Unknown identifier: ${identifier}`, 'GetRecord'))
  }
  const claimId = parseInt(match[1], 10)
  try {
    const claim = await fetchClaim(claimId)
    if (!claim) {
      res.set('Content-Type', 'text/xml; charset=utf-8')
      return res.send(oaiError('idDoesNotExist', `Claim ${claimId} not found`, 'GetRecord'))
    }
    const inner = `<GetRecord>\n  ${claimToRecord(claim, metadataPrefix)}\n</GetRecord>`
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.send(oaiEnvelope('GetRecord', `identifier="${escXml(identifier)}" metadataPrefix="${metadataPrefix}"`, inner))
  } catch (err) {
    res.set('Content-Type', 'text/xml; charset=utf-8')
    res.send(oaiError('badArgument', `Upstream error: ${String(err)}`, 'GetRecord'))
  }
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerOaiPmh(app: Express): void {
  app.get('/oai', async (req: Request, res: Response) => {
    const verb = req.query.verb as string
    switch (verb) {
      case 'Identify':
        return handleIdentify(req, res)
      case 'ListMetadataFormats':
        return handleListMetadataFormats(req, res)
      case 'ListSets':
        return handleListSets(req, res)
      case 'ListIdentifiers':
        return handleListIdentifiers(req, res)
      case 'ListRecords':
        return handleListRecords(req, res)
      case 'GetRecord':
        return handleGetRecord(req, res)
      default:
        res.set('Content-Type', 'text/xml; charset=utf-8')
        return res.send(oaiError('badVerb', `Illegal OAI verb: ${verb ?? '(missing)'}`, verb ?? ''))
    }
  })
  console.log('[OAI-PMH] Endpoint registered: GET /oai?verb=...')
}
