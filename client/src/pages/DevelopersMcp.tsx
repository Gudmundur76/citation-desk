import { useState } from "react";
import { Link } from "wouter";

// ── Code block with copy button ───────────────────────────────────────────────

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="relative group">
      <pre className={`language-${language} bg-gray-950 border border-gray-800 rounded-lg p-4 overflow-x-auto text-sm text-gray-200 leading-relaxed`}>
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// ── Tab component ─────────────────────────────────────────────────────────────

function Tabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 border-b border-gray-800 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              active === i
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs[active].content}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DevelopersMcp() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              citation.is
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/developers" className="text-gray-400 hover:text-white text-sm">
              Developers
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white text-sm font-medium">MCP Server</span>
          </div>
          <a
            href="/.well-known/mcp.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-mono"
          >
            /.well-known/mcp.json ↗
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* Hero */}
        <section>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950 border border-blue-800 rounded-full text-blue-300 text-xs font-medium mb-6">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            MCP 2024-11-05 · JSON-RPC 2.0 · No auth required for reads
          </div>
          <a
            href="https://aaif.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 border border-gray-700 rounded-full text-gray-300 text-xs font-medium mb-6 hover:border-blue-600 transition-colors"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            AAIF Ecosystem · goose · agentgateway compatible
          </a>
          <h1 className="text-4xl font-bold text-white mb-4">
            citation.is MCP Server
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
            Add verified scientific grounding to any AI system in under 60 seconds.
            One config line. No API key. Works with Claude Desktop, Cursor, LangChain,
            LlamaIndex, and any MCP-compatible agent.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { label: "Tools", value: "12" },
              { label: "Auth required", value: "None (reads)" },
              { label: "Protocol", value: "MCP 2024-11-05" },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick setup */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Quick Setup</h2>
          <Tabs tabs={[
            {
              label: "Claude Desktop",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Add to <code className="text-blue-300">~/.claude/claude_desktop_config.json</code> and restart Claude Desktop.
                  </p>
                  <CodeBlock language="json" code={`{
  "mcpServers": {
    "citation-is": {
      "command": "npx",
      "args": ["-y", "@citation-is/mcp-server"]
    }
  }
}`} />
                  <p className="text-xs text-gray-500">
                    Claude will now call citation.is automatically when answering scientific questions.
                  </p>
                </div>
              ),
            },
            {
              label: "Cursor",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Add to <code className="text-blue-300">.cursor/mcp.json</code> in your project root.
                  </p>
                  <CodeBlock language="json" code={`{
  "mcpServers": {
    "citation-is": {
      "command": "npx",
      "args": ["-y", "@citation-is/mcp-server"]
    }
  }
}`} />
                </div>
              ),
            },
            {
              label: "goose",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Add citation.is to{" "}
                    <a href="https://github.com/block/goose" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">goose</a>
                    {" "}— the open-source AAIF-compatible agent runtime by Block.
                  </p>
                  <CodeBlock language="yaml" code={`# ~/.config/goose/profiles/citation-is.yaml
extensions:
  - name: citation-is
    type: mcp
    url: https://citation.is/mcp
    transport: streamable_http`} />
                  <p className="text-gray-400 text-sm">Or via the goose CLI:</p>
                  <CodeBlock language="bash" code={`goose session --profile citation-is`} />
                  <p className="text-xs text-gray-500">
                    goose will call citation.is automatically when answering scientific questions.
                    Part of the{" "}
                    <a href="https://aaif.io" target="_blank" rel="noopener noreferrer" className="text-blue-400">Agentic AI Foundation</a>
                    {" "}ecosystem.
                  </p>
                </div>
              ),
            },
            {
              label: "agentgateway",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Use{" "}
                    <a href="https://github.com/agentgateway/agentgateway" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">agentgateway</a>
                    {" "}as a local MCP proxy — useful for enterprise deployments with observability, retries, and routing.
                  </p>
                  <CodeBlock language="yaml" code={`# agentgateway config.yaml
listeners:
  - name: mcp-listener
    protocol: MCP
    address: "0.0.0.0:8080"

targets:
  - name: citation-is
    protocol: MCP
    url: https://citation.is/mcp
    transport: streamable_http
    timeout_ms: 10000
    retry:
      max_attempts: 3
      backoff_ms: 500

routing:
  default: citation-is`} />
                  <CodeBlock language="bash" code={`# Run the gateway
agentgateway --config config.yaml

# Point any MCP client to:
# http://localhost:8080/mcp`} />
                </div>
              ),
            },
            {
              label: "HTTP Direct",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">
                    Call the MCP endpoint directly — no package needed.
                  </p>
                  <CodeBlock language="bash" code={`# Search verified claims
curl -X POST https://citation.is/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_claims",
      "arguments": { "query": "BRCA1 BARD1 interaction" }
    }
  }'`} />
                </div>
              ),
            },
            {
              label: "Python",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">LangChain integration:</p>
                  <CodeBlock language="python" code={`from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient({
    "citation_is": {
        "url": "https://citation.is/mcp",
        "transport": "streamable_http"
    }
}) as client:
    tools = client.get_tools()
    # search_claims, verify_claim, get_claim now available
    result = await tools[0].ainvoke({
        "query": "creatine muscle strength meta-analysis"
    })
    print(result)`} />
                </div>
              ),
            },
            {
              label: "TypeScript",
              content: (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">LlamaIndex integration:</p>
                  <CodeBlock language="typescript" code={`import { MCPToolSpec } from "llamaindex";

const citationTools = new MCPToolSpec({
  serverUrl: "https://citation.is/mcp",
});

const tools = await citationTools.toToolList();
// tools[0] = search_claims
// tools[1] = verify_claim
// tools[2] = get_claim

const agent = new ReActAgent({ tools });
const response = await agent.chat(
  "Is creatine supplementation effective for strength training?"
);`} />
                </div>
              ),
            },
          ]} />
        </section>

        {/* Tools reference */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Tools Reference</h2>
          <div className="space-y-6">

            {/* search_claims */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-mono font-bold text-blue-300">search_claims</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Search the verified claims registry by keyword, topic, organism, or method.
                  </p>
                </div>
                <span className="text-xs bg-green-950 text-green-400 border border-green-800 px-2 py-1 rounded">No auth</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Required</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-300 bg-gray-950 px-2 py-0.5 rounded">query</code>
                      <span className="text-xs text-gray-500">string — search text</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Optional</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-300 bg-gray-950 px-2 py-0.5 rounded">vertical</code>
                      <span className="text-xs text-gray-500">domain filter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-300 bg-gray-950 px-2 py-0.5 rounded">verdict</code>
                      <span className="text-xs text-gray-500">verdict filter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-300 bg-gray-950 px-2 py-0.5 rounded">limit</code>
                      <span className="text-xs text-gray-500">1–50, default 10</span>
                    </div>
                  </div>
                </div>
              </div>
              <CodeBlock language="json" code={`// Example call
{
  "name": "search_claims",
  "arguments": {
    "query": "salmon omega-3 bioavailability",
    "vertical": "salmon_biotech",
    "limit": 5
  }
}`} />
            </div>

            {/* verify_claim */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-mono font-bold text-blue-300">verify_claim</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Verify a specific scientific claim against PubMed, UniProt, PDB, and PubChem in real time.
                    Returns verdict, confidence score, evidence source, and rationale.
                  </p>
                </div>
                <span className="text-xs bg-green-950 text-green-400 border border-green-800 px-2 py-1 rounded">No auth</span>
              </div>
              <CodeBlock language="json" code={`// Example call
{
  "name": "verify_claim",
  "arguments": {
    "claim": "BRCA1 forms a heterodimer with BARD1 stabilised by a RING domain interface"
  }
}

// Example response
{
  "verdict": "Supported",
  "confidenceScore": 0.94,
  "evidenceSource": "PDB: 1JM7",
  "rationale": "Crystal structure confirms RING-RING heterodimer interface at 2.8Å resolution.",
  "sourceUrl": "https://www.rcsb.org/structure/1JM7",
  "claimId": 142,
  "loopTriggered": true
}`} />
            </div>

            {/* get_claim */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-mono font-bold text-blue-300">get_claim</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Retrieve a specific verified claim by ID. Returns the full record including all metadata.
                  </p>
                </div>
                <span className="text-xs bg-green-950 text-green-400 border border-green-800 px-2 py-1 rounded">No auth</span>
              </div>
              <CodeBlock language="json" code={`// Example call
{
  "name": "get_claim",
  "arguments": {
    "claim_id": "clm_abc123"
  }
}`} />
            </div>

          </div>
        </section>

        {/* Live Routing */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Live Routing &amp; Autonomous Ingestion</h2>
          <div className="bg-gray-900 border border-blue-900 rounded-xl p-6 space-y-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              citation.is <span className="text-blue-400 font-medium">never returns an empty result</span>. When a claim is not found
              in the registry, the system routes the query to authoritative public databases in real time, verifies the result,
              and returns a grounded answer. The verified claim is then written back to the registry asynchronously — every
              enterprise query compounds the knowledge graph automatically.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {([
                { step: "1", label: "Registry Lookup", desc: "Fast cache hit — returns immediately if claim exists.", color: "green" },
                { step: "2", label: "Live Routing", desc: "On miss, routes to PubMed / UniProt / PDB in real time.", color: "blue" },
                { step: "3", label: "Autonomous Ingest", desc: "Verified result written back to registry asynchronously.", color: "purple" },
              ] as const).map((s) => (
                <div key={s.step} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                  <div className="text-xs font-bold text-blue-400 mb-1">Step {s.step}</div>
                  <div className="text-sm font-medium text-white mb-1">{s.label}</div>
                  <div className="text-xs text-gray-500">{s.desc}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-950 rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Response fields that signal live routing activity</div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <code className="text-xs text-blue-300 font-mono bg-gray-900 px-2 py-0.5 rounded shrink-0">loopTriggered</code>
                  <span className="text-xs text-gray-400"><span className="text-green-400">true</span> when PubMed results were found and the autonomous ingestion loop was triggered for this query.</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="text-xs text-blue-300 font-mono bg-gray-900 px-2 py-0.5 rounded shrink-0">claimId</code>
                  <span className="text-xs text-gray-400">Registry ID of the claim when it already existed. <span className="text-gray-500">null</span> for live queries where ingestion is still in progress.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Verdicts */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Verdict Schema</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { verdict: "Supported", color: "green", desc: "Claim verified against authoritative source with high confidence." },
              { verdict: "Contradicted", color: "red", desc: "Claim contradicts data in the authoritative source." },
              { verdict: "Ambiguous", color: "yellow", desc: "Evidence is mixed or conflicting across sources." },
              { verdict: "Insufficient Evidence", color: "gray", desc: "Not enough data in the registry to make a determination." },
              { verdict: "Out of Scope", color: "gray", desc: "Claim type cannot be automatically verified." },
              { verdict: "Needs Expert Review", color: "orange", desc: "Requires domain specialist assessment." },
            ].map((v) => (
              <div key={v.verdict} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className={`text-sm font-medium text-${v.color}-400 mb-1`}>{v.verdict}</div>
                <div className="text-xs text-gray-500">{v.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Discovery endpoints */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Discovery Endpoints</h2>
          <div className="space-y-3">
            {[
              { path: "/.well-known/mcp.json", desc: "MCP tool card — auto-discovered by MCP-compatible agents" },
              { path: "/mcp", desc: "MCP endpoint — POST JSON-RPC 2.0 calls here" },
              { path: "/llms.txt", desc: "AI instructions and endpoint documentation" },
              { path: "/llms-full.txt", desc: "Full verified claims corpus for LLM grounding and RAG" },
              { path: "/api/public/claims.json", desc: "Bulk claims download (CC BY 4.0)" },
              { path: "/sitemap.xml", desc: "All public claim and registry URLs" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <a
                  href={ep.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-blue-300 hover:text-blue-200 min-w-64"
                >
                  {ep.path}
                </a>
                <span className="text-sm text-gray-500">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Rate limits */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Rate Limits</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Tier</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Requests / hour</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Auth</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="px-4 py-3 text-white">Anonymous</td>
                  <td className="px-4 py-3 text-gray-300">10 / IP / tool</td>
                  <td className="px-4 py-3 text-gray-500">None</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="px-4 py-3 text-white">API Key</td>
                  <td className="px-4 py-3 text-gray-300">1,000</td>
                  <td className="px-4 py-3 text-gray-500">Bearer token</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-white">Enterprise</td>
                  <td className="px-4 py-3 text-gray-300">Unlimited</td>
                  <td className="px-4 py-3 text-gray-500">OAuth 2.0 PKCE</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            For enterprise access (Perplexity, Claude, ChatGPT integrations) contact us via{" "}
            <Link href="/pricing" className="text-blue-400 hover:text-blue-300">pricing</Link>.
          </p>
        </section>

        {/* Footer nav */}
        <section className="border-t border-gray-800 pt-8 flex items-center justify-between">
          <Link href="/developers" className="text-blue-400 hover:text-blue-300 text-sm">
            ← Back to Developers
          </Link>
          <a
            href="/.well-known/mcp.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View MCP card →
          </a>
        </section>

      </div>
    </div>
  );
}
