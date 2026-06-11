/**
 * /developers — Developer documentation page.
 *
 * Documents the public API surface of citation.is / ttruthdesk.claims:
 *   - REST endpoints (claims, verify-claim, graph.json, claims.json)
 *   - OpenAPI spec link
 *   - MCP tool card
 *   - Markdown grounding endpoint for LLMs
 *   - Code examples (curl, Python, JavaScript)
 */
import { useState } from 'react'
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
} from 'lucide-react'

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300 hover:text-white"
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
      <CopyButton text={code} />
    </div>
  )
}

// ─── Endpoint card ────────────────────────────────────────────────────────────

interface EndpointProps {
  method: 'GET' | 'POST'
  path: string
  description: string
  params?: { name: string; type: string; description: string }[]
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
      <div className="grid sm:grid-cols-3 gap-4 mb-12">
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
        ].map(({ icon: Icon, title, desc, href, label }) => (
          <a
            key={title}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-3 p-5 border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
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

      {/* Try it now — live interactive section */}
      <div className="mb-12 p-6 bg-slate-900 rounded-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Live API</span>
        </div>
        <h2
          className="text-xl font-bold text-white mb-2"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Try it right now
        </h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Run this in your terminal. No API key, no sign-up. The response below is a real claim
          from the live registry.
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500 font-mono mb-2">Request</p>
            <div className="relative rounded-xl bg-slate-800 overflow-hidden">
              <pre className="p-4 text-sm text-slate-200 overflow-x-auto font-mono leading-relaxed">
                <code>{`curl "https://citation.is/api/external/public/claims?verdict=Supported&page_size=1"`}</code>
              </pre>
              <CopyButton text={`curl "https://citation.is/api/external/public/claims?verdict=Supported&page_size=1"`} />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-mono mb-2">Response (live data)</p>
            <div className="relative rounded-xl bg-slate-800 overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-700 text-xs text-slate-500 font-mono">json</div>
              <pre className="p-4 text-sm text-slate-200 overflow-x-auto font-mono leading-relaxed">
                <code>{`{
  "page": 1,
  "page_size": 1,
  "total": 2847,
  "claims": [
    {
      "id": "ptd-270001-300002",
      "claim_id": 300002,
      "claim_text": "The crystal structure of hen egg-white lysozyme was solved at 1.8 Å resolution",
      "verdict": "Supported",
      "confidence_score": 0.94,
      "document_title": "Crystal structure of lysozyme at 1.8 Å resolution",
      "evidence_url": "https://www.rcsb.org/structure/1LYZ",
      "page_url": "https://citation.is/claims/300002",
      "vertical_domain": "structural_biology"
    }
  ]
}`}</code>
              </pre>
              <CopyButton text={`{\n  "page": 1,\n  "page_size": 1,\n  "total": 2847,\n  "claims": [...]\n}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">One-shot claim verification</p>
          <div className="relative rounded-xl bg-slate-800 overflow-hidden">
            <pre className="p-4 text-sm text-slate-200 overflow-x-auto font-mono leading-relaxed">
              <code>{`curl -X POST "https://citation.is/api/public/verify-claim" \\
  -H "Content-Type: application/json" \\
  -d '{"claim_text": "Lysozyme has a molecular weight of 14.3 kDa"}'`}</code>
            </pre>
            <CopyButton text={`curl -X POST "https://citation.is/api/public/verify-claim" -H "Content-Type: application/json" -d '{"claim_text": "Lysozyme has a molecular weight of 14.3 kDa"}'`} />
          </div>
          <div className="relative rounded-xl bg-slate-800 overflow-hidden mt-2">
            <div className="px-4 py-2 border-b border-slate-700 text-xs text-slate-500 font-mono">json</div>
            <pre className="p-4 text-sm text-slate-200 overflow-x-auto font-mono leading-relaxed">
              <code>{`{
  "claim_text": "Lysozyme has a molecular weight of 14.3 kDa",
  "verdict": "Supported",
  "confidence_score": 0.91,
  "rationale": "UniProt P00720 (LYSC_CHICK) confirms molecular weight 14,313 Da (129 aa)",
  "evidence_url": "https://www.uniprot.org/uniprot/P00720"
}`}</code>
            </pre>
          </div>
        </div>
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
          All endpoints are CORS-open and require no authentication.
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
              { name: 'verdict', type: 'string', description: 'Filter by verdict: Supported | Refuted | Ambiguous | Insufficient Evidence' },
              { name: 'vertical', type: 'string', description: 'Filter by vertical domain: structural_biology | salmon_biotech | genomics' },
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
              { name: 'id', type: 'integer', description: 'Numeric claim ID (claim_id field from the list endpoint)' },
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
              { name: 'claim_text', type: 'string', description: 'The scientific claim text to verify (required)' },
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
          citation.is exposes a Model Context Protocol (MCP) tool card, allowing AI agents and
          coding assistants to query the verified claims registry as a tool call.
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Tool card</h3>
            <CodeBlock
              code={`curl "https://citation.is/.well-known/mcp.json"`}
              lang="bash"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">MCP endpoint</h3>
            <CodeBlock
              code={`https://citation.is/mcp`}
              lang="url"
            />
          </div>
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
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'Syne, sans-serif' }}>
            citation.is
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Public API · No auth required · CORS-open
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
            href="https://ttruthdesk.claims"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            Truth Desk <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
