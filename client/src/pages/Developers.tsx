/**
 * /developers — Developer documentation page.
 *
 * Phase C5 enhancements:
 * - Live API playground (real fetch calls, live responses)
 * - Interactive claim verifier (text input → real verdict)
 * - OAI-PMH documentation section
 * - A2A agent card + llms.txt documentation
 * - Improved MCP section with tool schema
 * - API changelog / versioning section
 * - TypeScript types section
 */
import { useState, useRef } from 'react'
import {
  Code2,
  Terminal,
  Zap,
  BookOpen,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Cpu,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Bot,
  History,
} from 'lucide-react'

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white ${className}`}
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="relative rounded-xl bg-slate-900 overflow-hidden">
      {lang && (
        <div className="px-4 py-2 border-b border-slate-700 text-xs text-slate-500 font-mono">
          {lang}
        </div>
      )}
      <pre className="p-4 text-sm text-slate-200 overflow-x-auto font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <CopyButton text={code} className="absolute top-3 right-3" />
    </div>
  )
}

// ─── Endpoint card ────────────────────────────────────────────────────────────

interface EndpointProps {
  method: 'GET' | 'POST'
  path: string
  description: string
  params?: { name: string; type: string; required?: boolean; description: string }[]
  example?: string
  response?: string
}

function Endpoint({ method, path, description, params, example, response }: EndpointProps) {
  const [open, setOpen] = useState(false)
  const methodColors = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className={`text-xs font-bold px-2 py-0.5 rounded border font-mono shrink-0 ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-slate-800 flex-1">{path}</code>
        <span className="text-xs text-slate-500 hidden sm:block flex-1">{description}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50">
          <p className="text-sm text-slate-600">{description}</p>

          {params && params.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Parameters
              </h4>
              <div className="space-y-2">
                {params.map(p => (
                  <div key={p.name} className="flex items-start gap-3 text-sm">
                    <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700 shrink-0">
                      {p.name}
                    </code>
                    <span className="text-xs text-slate-400 shrink-0">{p.type}</span>
                    {p.required && (
                      <span className="text-xs text-red-500 shrink-0">required</span>
                    )}
                    <span className="text-slate-600 text-xs">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {example && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Example
              </h4>
              <CodeBlock code={example} lang="bash" />
            </div>
          )}

          {response && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Response
              </h4>
              <CodeBlock code={response} lang="json" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Verdict icon ─────────────────────────────────────────────────────────────

function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === 'Supported') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
  if (verdict === 'Refuted') return <XCircle className="w-5 h-5 text-red-500" />
  return <AlertCircle className="w-5 h-5 text-amber-500" />
}

function verdictColor(verdict: string) {
  if (verdict === 'Supported') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (verdict === 'Refuted') return 'text-red-700 bg-red-50 border-red-200'
  return 'text-amber-700 bg-amber-50 border-amber-200'
}

// ─── Live API Playground ──────────────────────────────────────────────────────

function LivePlayground() {
  const [query, setQuery] = useState('lysozyme')
  const [verdict, setVerdict] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | { claims: unknown[]; total: number; page: number; page_size: number }>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  const runQuery = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = Date.now()
    try {
      const params = new URLSearchParams({ page_size: '5', page: '1' })
      if (query.trim()) params.set('q', query.trim())
      if (verdict) params.set('verdict', verdict)
      const res = await fetch(`/api/external/public/claims?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
      setElapsed(Date.now() - t0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const curlCmd = `curl "https://citation.is/api/external/public/claims?q=${encodeURIComponent(query || 'lysozyme')}${verdict ? `&verdict=${verdict}` : ''}&page_size=5"`

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live Playground</span>
        <span className="text-xs text-slate-500 ml-auto">Queries the real citation.is API</span>
      </div>

      <div className="p-5 space-y-4 bg-white">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runQuery()}
            placeholder="Search claims (e.g. lysozyme, CRISPR, salmon...)"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
          />
          <select
            value={verdict}
            onChange={e => setVerdict(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            <option value="">All verdicts</option>
            <option value="Supported">Supported</option>
            <option value="Refuted">Refuted</option>
            <option value="Ambiguous">Ambiguous</option>
            <option value="Insufficient Evidence">Insufficient Evidence</option>
          </select>
          <button
            onClick={runQuery}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run
          </button>
        </div>

        {/* Generated curl */}
        <div className="rounded-lg bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
            <span className="text-xs text-slate-500 font-mono">Generated curl command</span>
            <CopyButton text={curlCmd} />
          </div>
          <pre className="px-4 py-3 text-xs text-slate-300 font-mono overflow-x-auto">{curlCmd}</pre>
        </div>

        {/* Results */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{result.total.toLocaleString()} total results</span>
              <span>·</span>
              <span>showing {(result.claims as unknown[]).length}</span>
              {elapsed !== null && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {elapsed}ms
                  </span>
                </>
              )}
            </div>
            <div className="space-y-2">
              {(result.claims as Array<{
                claim_id: number
                claim_text: string
                verdict: string
                confidence_score: number
                vertical_domain: string
                document_title: string
              }>).map(claim => (
                <a
                  key={claim.claim_id}
                  href={`/claims/${claim.claim_id}`}
                  className="block p-3 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-start gap-2 mb-1.5">
                    <VerdictIcon verdict={claim.verdict} />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${verdictColor(claim.verdict)}`}>
                      {claim.verdict}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto shrink-0">
                      {Math.round(claim.confidence_score * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-snug line-clamp-2 group-hover:text-slate-900">
                    {claim.claim_text}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{claim.document_title}</p>
                </a>
              ))}
            </div>
            {/* Raw JSON toggle */}
            <details className="group">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                View raw JSON response
              </summary>
              <div className="mt-2 relative rounded-xl bg-slate-900 overflow-hidden">
                <CopyButton text={JSON.stringify(result, null, 2)} className="absolute top-3 right-3" />
                <pre className="p-4 text-xs text-slate-300 overflow-x-auto font-mono max-h-64">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Interactive Claim Verifier ───────────────────────────────────────────────

function ClaimVerifier() {
  const [claimText, setClaimText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<null | {
    verdict: string
    confidence_score: number
    rationale: string
    evidence_url?: string
  }>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const EXAMPLES = [
    'Lysozyme has a molecular weight of 14.3 kDa',
    'The crystal structure of EGFR was solved at 2.6 Å resolution',
    'Atlantic salmon (Salmo salar) is susceptible to infectious salmon anaemia virus',
  ]

  const verify = async () => {
    if (!claimText.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/public/verify-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_text: claimText.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
      setElapsed(Date.now() - t0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 px-5 py-4 flex items-center gap-3">
        <Zap className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">One-Shot Verifier</span>
        <span className="text-xs text-slate-500 ml-auto">POST /api/public/verify-claim</span>
      </div>

      <div className="p-5 space-y-4 bg-white">
        {/* Example pills */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 self-center">Try:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => {
                setClaimText(ex)
                setResult(null)
                setError(null)
              }}
              className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
            >
              {ex.length > 45 ? ex.slice(0, 45) + '…' : ex}
            </button>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={claimText}
          onChange={e => setClaimText(e.target.value)}
          placeholder="Enter a scientific claim to verify..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none font-mono"
        />

        <button
          onClick={verify}
          disabled={loading || !claimText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Verifying…' : 'Verify Claim'}
        </button>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <XCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-xl border ${verdictColor(result.verdict)}`}>
            <div className="flex items-center gap-3 mb-3">
              <VerdictIcon verdict={result.verdict} />
              <span className="font-bold text-base">{result.verdict}</span>
              <span className="text-sm ml-auto font-mono">
                {Math.round(result.confidence_score * 100)}% confidence
              </span>
              {elapsed !== null && (
                <span className="text-xs flex items-center gap-1 opacity-60">
                  <Clock className="w-3 h-3" />
                  {elapsed}ms
                </span>
              )}
            </div>
            {result.rationale && (
              <p className="text-sm leading-relaxed mb-3">{result.rationale}</p>
            )}
            {result.evidence_url && (
              <a
                href={result.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-3 h-3" />
                {result.evidence_url}
              </a>
            )}
            <details className="mt-3 group">
              <summary className="text-xs cursor-pointer hover:opacity-80 select-none opacity-60">
                View raw JSON
              </summary>
              <div className="mt-2 relative rounded-lg bg-slate-900 overflow-hidden">
                <CopyButton text={JSON.stringify(result, null, 2)} className="absolute top-2 right-2" />
                <pre className="p-3 text-xs text-slate-300 overflow-x-auto font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Developers() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 mb-6">
          <Code2 className="w-3.5 h-3.5" />
          Developer Documentation
        </div>
        <h1
          className="text-4xl font-bold text-slate-900 mb-4 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Build with citation.is
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
          The citation.is public API gives you programmatic access to 3,900+ verified scientific
          claims, the knowledge graph, and one-shot claim verification — all backed by the
          Protein Truth Desk pipeline.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-4 gap-3 mb-12">
        {[
          {
            icon: Database,
            title: 'REST API',
            desc: 'Paginated claims, filtering, and detail endpoints',
            href: '/openapi.json',
            label: 'OpenAPI spec',
          },
          {
            icon: Cpu,
            title: 'MCP Tool',
            desc: 'Use citation.is as an MCP tool in your AI agent',
            href: '/.well-known/mcp.json',
            label: 'MCP card',
          },
          {
            icon: Globe,
            title: 'LLM Grounding',
            desc: 'Markdown summary for grounding language models',
            href: '/api/md',
            label: 'View /api/md',
          },
          {
            icon: Bot,
            title: 'Agent Card',
            desc: 'A2A agent card for autonomous agent discovery',
            href: '/.well-known/agent-card.json',
            label: 'agent-card.json',
          },
        ].map(({ icon: Icon, title, desc, href, label }) => (
          <a
            key={title}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Icon className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 flex items-center gap-1 transition-colors mt-auto">
              {label} <ExternalLink className="w-3 h-3" />
            </span>
          </a>
        ))}
      </div>

      {/* Live API Playground */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Live API Playground
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Query the real citation.is claims registry directly from this page. No API key, no sign-up.
        </p>
        <LivePlayground />
      </div>

      {/* Interactive Claim Verifier */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          One-Shot Claim Verifier
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Submit any scientific claim and receive an immediate verdict from the Truth Desk pipeline.
          This calls <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">POST /api/public/verify-claim</code> live.
        </p>
        <ClaimVerifier />
      </div>

      {/* Why citation.is vs Perplexity / Semantic Scholar */}
      <div className="mb-12 p-6 border border-slate-200 rounded-2xl">
        <h2
          className="text-xl font-bold text-slate-900 mb-2"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Why not just use Perplexity or Semantic Scholar?
        </h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          These are different tools solving different problems.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-700"> </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Perplexity</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Semantic Scholar</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 bg-slate-900 text-white rounded-t-lg">citation.is</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['Unit of output', 'Answer + paper links', 'Paper metadata', 'Typed verdict on a specific claim'],
                ['Stable PID per claim', '✗', '✗ (paper-level only)', '✓ (claim_id persists across re-evaluations)'],
                ['Confidence score', '✗', '✗', '✓ (0.0–1.0 per claim)'],
                ['Contradiction detection', '✗', '✗', '✓ (cross-document graph edges)'],
                ['Machine-queryable via MCP', '✗', '✗', '✓'],
                ['Provenance chain', '✗', '✗', '✓ (full audit trail per claim)'],
                ['Re-evaluation on new evidence', '✗', '✗', '✓ (every 6 hours)'],
              ].map(([feature, perplexity, semantic, citation]) => (
                <tr key={feature} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700 text-xs">{feature}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{perplexity}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{semantic}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-emerald-700 bg-emerald-50">{citation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Base URL */}
      <div className="mb-10">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Base URL
        </h2>
        <CodeBlock code="https://citation.is" />
        <p className="text-xs text-slate-400 mt-2">
          All endpoints are CORS-open and require no authentication. Rate limit: 60 requests/minute per IP.
        </p>
      </div>

      {/* REST Endpoints */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-6"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          REST Endpoints
        </h2>
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/api/external/public/claims"
            description="Paginated list of all verified claims. Supports filtering by verdict, vertical domain, claim type, and free-text search."
            params={[
              { name: 'page', type: 'integer', description: 'Page number (default: 1)' },
              { name: 'page_size', type: 'integer', description: 'Results per page (default: 20, max: 100)' },
              { name: 'q', type: 'string', description: 'Free-text search across claim text and document title' },
              { name: 'verdict', type: 'string', description: 'Filter by verdict: Supported | Partially Supported | Ambiguous | Contradicted | Insufficient Evidence | Out of Scope | Needs Expert Review' },
              { name: 'vertical', type: 'string', description: 'Filter by vertical domain: structural_biology | salmon_biotech (more verticals added continuously)' },
              { name: 'claim_type', type: 'string', description: 'Filter by claim type: quantitative | qualitative | structural | functional' },
            ]}
            example={`curl "https://citation.is/api/external/public/claims?verdict=Supported&vertical=structural_biology&page=1"`}
            response={`{
  "page": 1,
  "page_size": 20,
  "total": 2847,
  "total_pages": 143,
  "claims": [
    {
      "id": "ptd-270001-300002",
      "claim_id": 300002,
      "document_id": 270001,
      "document_title": "Crystal structure of lysozyme at 1.8 Å",
      "vertical_domain": "structural_biology",
      "claim_text": "The crystal structure was solved at 1.8 Å resolution",
      "verdict": "Supported",
      "confidence_score": 0.94,
      "evidence_url": "https://www.rcsb.org/structure/1LYZ",
      "page_url": "https://citation.is/claims/300002",
      "audit_url": "https://citation.is/audit/270001"
    }
  ]
}`}
          />

          <Endpoint
            method="GET"
            path="/api/external/public/claims/:id"
            description="Full detail for a single claim by its numeric ID. Includes JSON-LD structured data for SEO and machine consumption."
            params={[
              { name: 'id', type: 'integer', required: true, description: 'Numeric claim ID (claim_id field from the list endpoint)' },
            ]}
            example={`curl "https://citation.is/api/external/public/claims/300002"`}
            response={`{
  "id": "ptd-270001-300002",
  "claim_id": 300002,
  "claim_text": "The crystal structure was solved at 1.8 Å resolution",
  "verdict": "Supported",
  "verdict_rationale": "PDB entry 1LYZ confirms the resolution at 1.8 Å...",
  "confidence_score": 0.94,
  "evidence_url": "https://www.rcsb.org/structure/1LYZ",
  "jsonld": [{ "@context": "https://schema.org", "@type": "ClaimReview", ... }]
}`}
          />

          <Endpoint
            method="POST"
            path="/api/public/verify-claim"
            description="One-shot claim verification. Submit a claim text and receive an immediate verdict from the Truth Desk pipeline."
            params={[
              { name: 'claim_text', type: 'string', required: true, description: 'The scientific claim text to verify' },
              { name: 'vertical_domain', type: 'string', description: 'Optional domain hint to route to the correct adapter' },
            ]}
            example={`curl -X POST "https://citation.is/api/public/verify-claim" \\
  -H "Content-Type: application/json" \\
  -d '{"claim_text": "Lysozyme has a molecular weight of 14.3 kDa"}'`}
            response={`{
  "claim_text": "Lysozyme has a molecular weight of 14.3 kDa",
  "verdict": "Supported",
  "confidence_score": 0.91,
  "rationale": "UniProt P00720 confirms the molecular weight at 14,313 Da",
  "evidence_url": "https://www.uniprot.org/uniprot/P00720"
}`}
          />

          <Endpoint
            method="GET"
            path="/api/public/claims.json"
            description="Machine-readable full registry export in JSON format. Suitable for bulk ingestion, dataset creation, or offline analysis."
            example={`curl "https://citation.is/api/public/claims.json" -o claims.json`}
          />

          <Endpoint
            method="GET"
            path="/api/public/graph.json"
            description="Full knowledge graph export. Contains entity nodes, relationships, and citation edges across all verified documents."
            example={`curl "https://citation.is/api/public/graph.json" -o graph.json`}
          />

          <Endpoint
            method="GET"
            path="/api/md"
            description="Markdown summary of the citation.is knowledge base, optimised for LLM context grounding. Use this to prime a language model with the current state of the registry."
            example={`curl "https://citation.is/api/md"`}
          />

          <Endpoint
            method="GET"
            path="/llms.txt"
            description="Agent-era sitemap following the llms.txt standard. Structured plain-text index of all content sections, machine-readable endpoints, and sub-context documents."
            example={`curl "https://citation.is/llms.txt"`}
          />

          <Endpoint
            method="GET"
            path="/llms-full.txt"
            description="Full LLM grounding document — 200 recent claims with verdicts and rationale, suitable for RAG pipelines and context injection. Refreshed every 5 minutes."
            example={`curl "https://citation.is/llms-full.txt"`}
          />

          <Endpoint
            method="GET"
            path="/rss.xml"
            description="RSS 2.0 feed of the 50 most recently verified claims. Subscribe to stay current with new verifications."
            example={`curl "https://citation.is/rss.xml"`}
          />
        </div>
      </div>

      {/* OAI-PMH section */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          OAI-PMH Harvesting
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          citation.is implements the{' '}
          <a href="https://www.openarchives.org/pmh/" target="_blank" rel="noopener noreferrer" className="underline">
            Open Archives Initiative Protocol for Metadata Harvesting (OAI-PMH 2.0)
          </a>
          , allowing academic search engines (BASE, OpenAIRE, Semantic Scholar) to harvest the full
          claims corpus. Metadata is available in Dublin Core (<code className="text-xs bg-slate-100 px-1 rounded font-mono">oai_dc</code>) and
          DataCite 4.x (<code className="text-xs bg-slate-100 px-1 rounded font-mono">datacite</code>) formats.
        </p>
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/oai?verb=Identify"
            description="Repository identification — name, admin email, earliest datestamp, and granularity."
            example={`curl "https://citation.is/oai?verb=Identify"`}
          />
          <Endpoint
            method="GET"
            path="/oai?verb=ListMetadataFormats"
            description="Lists supported metadata formats: oai_dc (Dublin Core) and datacite (DataCite 4.x)."
            example={`curl "https://citation.is/oai?verb=ListMetadataFormats"`}
          />
          <Endpoint
            method="GET"
            path="/oai?verb=ListSets"
            description="Lists available domain sets: claims, structural_biology, salmon_biotech, genomics, clinical_trials, nutrition."
            example={`curl "https://citation.is/oai?verb=ListSets"`}
          />
          <Endpoint
            method="GET"
            path="/oai?verb=ListRecords&metadataPrefix=oai_dc"
            description="Harvest all claim records in Dublin Core format. Use resumptionToken for pagination. Supports from/until date filtering."
            params={[
              { name: 'metadataPrefix', type: 'string', required: true, description: 'oai_dc or datacite' },
              { name: 'set', type: 'string', description: 'Domain set filter (e.g. structural_biology)' },
              { name: 'from', type: 'string', description: 'ISO 8601 date lower bound (e.g. 2026-01-01)' },
              { name: 'until', type: 'string', description: 'ISO 8601 date upper bound' },
              { name: 'resumptionToken', type: 'string', description: 'Pagination token from previous response' },
            ]}
            example={`curl "https://citation.is/oai?verb=ListRecords&metadataPrefix=datacite&set=structural_biology"`}
          />
          <Endpoint
            method="GET"
            path="/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:citation.is:300002"
            description="Fetch a single claim record by its OAI identifier."
            params={[
              { name: 'identifier', type: 'string', required: true, description: 'OAI identifier in format oai:citation.is:{claim_id}' },
              { name: 'metadataPrefix', type: 'string', required: true, description: 'oai_dc or datacite' },
            ]}
            example={`curl "https://citation.is/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:citation.is:300002"`}
          />
        </div>
      </div>

      {/* MCP section */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          MCP Integration
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          citation.is exposes a Model Context Protocol (MCP) server, allowing AI agents and
          coding assistants (Claude, Cursor, Windsurf, Continue) to query the verified claims
          registry as a native tool call.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Add to Claude / Cursor / Windsurf</h3>
            <CodeBlock
              code={`{
  "mcpServers": {
    "citation-is": {
      "url": "https://citation.is/mcp"
    }
  }
}`}
              lang="json"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Available MCP tools</h3>
            <div className="space-y-2">
              {[
                { name: 'list_claims', desc: 'Search and filter the claims registry. Params: q, verdict, vertical, page, page_size.' },
                { name: 'get_claim', desc: 'Fetch full detail for a single claim by ID. Params: claim_id (required).' },
                { name: 'verify_claim', desc: 'One-shot claim verification. Params: claim_text (required), vertical_domain (optional).' },
              ].map(tool => (
                <div key={tool.name} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <code className="text-xs bg-slate-900 text-emerald-400 px-2 py-1 rounded font-mono shrink-0">{tool.name}</code>
                  <p className="text-xs text-slate-600 leading-relaxed">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">MCP tool card</h3>
            <CodeBlock
              code={`curl "https://citation.is/.well-known/mcp.json"`}
              lang="bash"
            />
          </div>
        </div>
      </div>

      {/* Agent Discovery */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Agent Discovery
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          citation.is publishes standard well-known files for autonomous agent discovery,
          following the A2A (Agent-to-Agent) and isitagentready.com specifications.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { path: '/.well-known/agent-card.json', desc: 'A2A agent card — capabilities, endpoints, and authentication info for autonomous agents' },
            { path: '/.well-known/mcp/server-card.json', desc: 'MCP Server Card — tool schema and server metadata for MCP clients' },
            { path: '/.well-known/api-catalog', desc: 'API Catalog (application/linkset+json) — machine-readable API surface discovery' },
            { path: '/.well-known/agent-skills/index.json', desc: 'Agent Skills index — structured list of capabilities for agent orchestrators' },
            { path: '/.well-known/openapi.json', desc: 'OpenAPI 3.1 spec — full REST API schema for code generation and client SDKs' },
            { path: '/.well-known/oauth-authorization-server', desc: 'OAuth 2.0 authorization server metadata (RFC 8414) — for agents requiring auth context' },
          ].map(({ path, desc }) => (
            <a
              key={path}
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1.5 p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group"
            >
              <code className="text-xs font-mono text-slate-700 group-hover:text-slate-900">{path}</code>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Code examples */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-6"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Code Examples
        </h2>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Python — search claims</h3>
            </div>
            <CodeBlock
              lang="python"
              code={`import requests

resp = requests.get(
    "https://citation.is/api/external/public/claims",
    params={"q": "lysozyme", "verdict": "Supported", "page_size": 10}
)
data = resp.json()

for claim in data["claims"]:
    print(f"[{claim['verdict']}] {claim['claim_text'][:80]}")`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">JavaScript — verify a claim</h3>
            </div>
            <CodeBlock
              lang="javascript"
              code={`const response = await fetch("https://citation.is/api/public/verify-claim", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    claim_text: "Lysozyme has a molecular weight of 14.3 kDa"
  })
});

const result = await response.json();
console.log(result.verdict, result.confidence_score);`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">LLM grounding — prime your model</h3>
            </div>
            <CodeBlock
              lang="python"
              code={`import requests
from openai import OpenAI

# Fetch the markdown grounding document
grounding = requests.get("https://citation.is/api/md").text

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": f"You are a scientific fact-checker.\\n\\n{grounding}"},
        {"role": "user", "content": "Is the claim about lysozyme resolution supported?"}
    ]
)`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">OAI-PMH harvest — bulk ingest</h3>
            </div>
            <CodeBlock
              lang="python"
              code={`import requests
from xml.etree import ElementTree as ET

BASE = "https://citation.is/oai"
NS = {"oai": "http://www.openarchives.org/OAI/2.0/",
      "dc": "http://purl.org/dc/elements/1.1/"}

def harvest_all():
    token = None
    while True:
        params = {"verb": "ListRecords", "metadataPrefix": "oai_dc"}
        if token:
            params = {"verb": "ListRecords", "resumptionToken": token}
        root = ET.fromstring(requests.get(BASE, params=params).text)
        for record in root.findall(".//oai:record", NS):
            title = record.find(".//dc:title", NS)
            if title is not None:
                print(title.text)
        token_el = root.find(".//oai:resumptionToken", NS)
        if token_el is None or not token_el.text:
            break
        token = token_el.text

harvest_all()`}
            />
          </div>
        </div>
      </div>

      {/* TypeScript types */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          TypeScript Types
        </h2>
        <p className="text-slate-500 text-sm mb-4 leading-relaxed">
          Copy-paste these types into your TypeScript project for full type safety when consuming the citation.is API.
        </p>
        <CodeBlock
          lang="typescript"
          code={`// citation.is — TypeScript types (v1.1)

export type Verdict =
  | 'Supported'
  | 'Partially Supported'
  | 'Refuted'
  | 'Ambiguous'
  | 'Contradicted'
  | 'Insufficient Evidence'
  | 'Out of Scope'
  | 'Needs Expert Review'

export type VerticalDomain =
  | 'structural_biology'
  | 'salmon_biotech'
  | 'genomics'
  | 'clinical_trials'
  | 'nutrition'

export interface PublicClaim {
  id: string                    // "ptd-{doc_id}-{claim_id}"
  claim_id: number
  document_id: number
  document_title: string
  vertical_domain: VerticalDomain
  claim_text: string
  verdict: Verdict
  confidence_score: number      // 0.0–1.0
  evidence_url: string | null
  page_url: string              // "https://citation.is/claims/{claim_id}"
  audit_url: string             // "https://citation.is/audit/{document_id}"
  created_at: string            // ISO 8601
  updated_at: string            // ISO 8601
}

export interface ClaimsResponse {
  page: number
  page_size: number
  total: number
  total_pages: number
  claims: PublicClaim[]
}

export interface VerifyClaimResult {
  claim_text: string
  verdict: Verdict
  confidence_score: number
  rationale: string
  evidence_url: string | null
  pubmed_results?: Array<{ pmid: string; title: string; abstract: string }>
  translated_claims?: string[]
}

// Fetch helper
export async function searchClaims(params: {
  q?: string
  verdict?: Verdict
  vertical?: VerticalDomain
  page?: number
  page_size?: number
}): Promise<ClaimsResponse> {
  const url = new URL('https://citation.is/api/external/public/claims')
  Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(\`citation.is API error: \${res.status}\`)
  return res.json()
}`}
        />
      </div>

      {/* API Changelog */}
      <div className="mb-12">
        <h2
          className="text-xl font-bold text-slate-900 mb-4"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          API Changelog
        </h2>
        <div className="space-y-4">
          {[
            {
              version: 'v1.1',
              date: 'June 2026',
              badge: 'current',
              changes: [
                'Added citations[] array to claims list and search responses (passage-level citation type: VERIFIED / CONTESTED / IMPLIED / BEYOND_EVIDENCE)',
                'Added confidence trend endpoint: GET /api/external/trpc/confidenceTrend.forClaim',
                'Added evidence timeline endpoint: GET /api/external/trpc/timeline.forClaim',
                'Added provenance chain endpoint: GET /api/external/trpc/provenance.getChain',
                'Added entity co-occurrence endpoint: GET /api/external/trpc/cooccurrence.forEntity',
                'Added OAI-PMH 2.0 endpoint at /oai (oai_dc + datacite formats)',
                'Added MCP server at /mcp with list_claims, get_claim, verify_claim tools',
                'Added llms.txt, llms-full.txt, rss.xml machine-readable endpoints',
              ],
            },
            {
              version: 'v1.0',
              date: 'May 2026',
              badge: 'stable',
              changes: [
                'Initial public API release',
                'GET /api/external/public/claims — paginated claims list with verdict/vertical/search filters',
                'GET /api/external/public/claims/:id — single claim detail with JSON-LD',
                'POST /api/public/verify-claim — one-shot claim verification',
                'GET /api/public/claims.json — bulk JSON export',
                'GET /api/public/graph.json — knowledge graph export',
                'GET /api/md — markdown grounding document',
                'GET /openapi.json — OpenAPI 3.1 spec',
              ],
            },
          ].map(({ version, date, badge, changes }) => (
            <div key={version} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
                <span className="font-bold text-slate-900 font-mono">{version}</span>
                <span className="text-xs text-slate-400">{date}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                  badge === 'current'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {badge}
                </span>
              </div>
              <ul className="px-5 py-4 space-y-1.5">
                {changes.map((change, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-300 mt-1 shrink-0">·</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Rate limits */}
      <div className="mb-12 p-6 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            Rate Limits &amp; SLA
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Rate limit', value: '60 req/min per IP', note: 'No API key required' },
            { label: 'Bulk export', value: 'Unlimited', note: 'claims.json and graph.json' },
            { label: 'Uptime target', value: '99.5%', note: 'Hosted on Manus Cloud Run' },
          ].map(({ label, value, note }) => (
            <div key={label} className="bg-white rounded-lg p-4 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-4">
          For higher rate limits or dedicated access, contact{' '}
          <a href="mailto:api@citation.is" className="underline">api@citation.is</a>.
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'Syne, sans-serif' }}>
            citation.is
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Public API · No auth required · CORS-open · CC BY 4.0
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            OpenAPI spec <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="/oai?verb=Identify"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            OAI-PMH <ExternalLink className="w-3 h-3" />
          </a>

        </div>
      </div>
    </div>
  )
}
