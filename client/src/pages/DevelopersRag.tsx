import { useState } from "react";
import { Link } from "wouter";

// ── Code block with copy button ───────────────────────────────────────────────
function CodeBlock({ code, language = "python" }: { code: string; language?: string }) {
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

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-semibold text-white mt-12 mb-4 flex items-center gap-2">
      <a href={`#${id}`} className="text-gray-600 hover:text-blue-400 text-sm">#</a>
      {children}
    </h2>
  );
}

// ── Code examples ─────────────────────────────────────────────────────────────
const LANGCHAIN_RETRIEVER = `from langchain.schema import BaseRetriever, Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
import requests

class CitationIsRetriever(BaseRetriever):
    """LangChain retriever backed by the citation.is verified claims API."""

    base_url: str = "https://citation.is"
    page_size: int = 10
    verdict_filter: str | None = None  # "Supported", "Contradicted", etc.
    manually_reviewed_only: bool = False

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> list[Document]:
        params: dict = {"q": query, "page_size": self.page_size}
        if self.verdict_filter:
            params["verdict"] = self.verdict_filter
        if self.manually_reviewed_only:
            params["manually_reviewed"] = "true"

        resp = requests.get(
            f"{self.base_url}/api/public/claims/search",
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        return [
            Document(
                page_content=claim["claim_text"],
                metadata={
                    "claim_id": claim["claim_id"],
                    "verdict": claim["verdict"],
                    "confidence_score": claim["confidence_score"],
                    "manually_reviewed": claim["manually_reviewed"],
                    "vertical": claim["vertical_domain"],
                    "source_url": claim["audit_url"],
                },
            )
            for claim in data.get("claims", [])
        ]

# Usage
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

retriever = CitationIsRetriever(
    verdict_filter="Supported",
    manually_reviewed_only=True,
)

qa = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4o"),
    retriever=retriever,
)

answer = qa.invoke({"query": "What is the resolution of PDB entry 7K3G?"})
print(answer["result"])`;

const LLAMAINDEX_RETRIEVER = `from llama_index.core import VectorStoreIndex, Document
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode
import requests

class CitationIsRetriever(BaseRetriever):
    """LlamaIndex retriever backed by the citation.is verified claims API."""

    def __init__(
        self,
        base_url: str = "https://citation.is",
        top_k: int = 10,
        verdict_filter: str | None = None,
        manually_reviewed_only: bool = False,
    ):
        self._base_url = base_url
        self._top_k = top_k
        self._verdict_filter = verdict_filter
        self._manually_reviewed_only = manually_reviewed_only
        super().__init__()

    def _retrieve(self, query_bundle: QueryBundle) -> list[NodeWithScore]:
        params: dict = {
            "q": query_bundle.query_str,
            "page_size": self._top_k,
        }
        if self._verdict_filter:
            params["verdict"] = self._verdict_filter
        if self._manually_reviewed_only:
            params["manually_reviewed"] = "true"

        resp = requests.get(
            f"{self._base_url}/api/public/claims/search",
            params=params,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        nodes = []
        for claim in data.get("claims", []):
            node = TextNode(
                text=claim["claim_text"],
                metadata={
                    "claim_id": claim["claim_id"],
                    "verdict": claim["verdict"],
                    "confidence_score": claim["confidence_score"],
                    "manually_reviewed": claim["manually_reviewed"],
                    "vertical": claim["vertical_domain"],
                    "source_url": claim["audit_url"],
                },
            )
            score = claim.get("confidence_score") or 0.5
            nodes.append(NodeWithScore(node=node, score=score))

        return nodes

# Usage
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.llms.openai import OpenAI

retriever = CitationIsRetriever(
    verdict_filter="Supported",
    top_k=5,
)

query_engine = RetrieverQueryEngine.from_args(
    retriever=retriever,
    llm=OpenAI(model="gpt-4o"),
)

response = query_engine.query(
    "Does creatine supplementation increase phosphocreatine resynthesis?"
)
print(response)`;

const DIRECT_API = `import requests

BASE = "https://citation.is"

# 1. Search verified claims
resp = requests.get(f"{BASE}/api/public/claims/search", params={
    "q": "PAX7 satellite cells muscle regeneration",
    "page_size": 5,
})
data = resp.json()

for claim in data["claims"]:
    print(f"[{claim['verdict']}] {claim['claim_text'][:80]}...")
    print(f"  confidence={claim['confidence_score']}  manually_reviewed={claim['manually_reviewed']}")
    print(f"  audit: {claim['audit_url']}")
    print()

# 2. Filter to manually-reviewed claims only (highest trust)
reviewed = requests.get(f"{BASE}/api/public/claims", params={
    "manually_reviewed": "true",
    "verdict": "Supported",
    "page_size": 20,
}).json()
print(f"Manually reviewed + Supported: {reviewed['total']} claims")

# 3. Get a single claim by ID
claim = requests.get(f"{BASE}/api/public/claims/1").json()
print(f"Claim #{claim['claim_id']}: {claim['claim_text']}")
print(f"Verdict: {claim['verdict']} ({claim['confidence_score']:.0%} confidence)")`;

const OPENAI_FUNCTION = `import openai
import requests
import json

client = openai.OpenAI()

def search_verified_claims(query: str, verdict: str | None = None) -> dict:
    """Search citation.is for verified scientific claims."""
    params = {"q": query, "page_size": 5}
    if verdict:
        params["verdict"] = verdict
    resp = requests.get(
        "https://citation.is/api/public/claims/search",
        params=params,
        timeout=10,
    )
    return resp.json()

tools = [
    {
        "type": "function",
        "function": {
            "name": "search_verified_claims",
            "description": (
                "Search the citation.is registry of verified scientific claims. "
                "Returns claims with verdicts (Supported/Contradicted/Insufficient Evidence), "
                "confidence scores, and audit trail URLs."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The scientific claim or topic to search for",
                    },
                    "verdict": {
                        "type": "string",
                        "enum": ["Supported", "Contradicted", "Insufficient Evidence"],
                        "description": "Optional: filter by verdict",
                    },
                },
                "required": ["query"],
            },
        },
    }
]

messages = [
    {"role": "user", "content": "Is creatine supplementation supported by evidence?"}
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto",
)

msg = response.choices[0].message
if msg.tool_calls:
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)
        result = search_verified_claims(**args)
        messages.append(msg)
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": json.dumps(result),
        })

    final = client.chat.completions.create(
        model="gpt-4o", messages=messages
    )
    print(final.choices[0].message.content)`;

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DevelopersRag() {
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
            <span className="text-white text-sm font-medium">RAG Integration</span>
          </div>
          <a
            href="/api/public/claims/search?q=protein+structure&page_size=3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 font-mono"
          >
            /api/public/claims/search ↗
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded">
              RAG
            </span>
            <span className="text-xs font-mono bg-blue-900/40 text-blue-400 border border-blue-800 px-2 py-0.5 rounded">
              LangChain
            </span>
            <span className="text-xs font-mono bg-purple-900/40 text-purple-400 border border-purple-800 px-2 py-0.5 rounded">
              LlamaIndex
            </span>
            <span className="text-xs font-mono bg-orange-900/40 text-orange-400 border border-orange-800 px-2 py-0.5 rounded">
              OpenAI Functions
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            RAG Integration Guide
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-3xl">
            Use citation.is as a <strong className="text-gray-200">verified knowledge retrieval layer</strong> in
            your RAG pipeline. Every retrieved chunk carries a verdict, confidence score, and
            full audit trail — grounding your LLM responses in evidence-backed claims rather
            than raw text.
          </p>
        </div>

        {/* Why use citation.is for RAG */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: "✓",
              color: "green",
              title: "Pre-verified chunks",
              desc: "Every claim has already been checked against primary sources. No hallucination risk from unverified context.",
            },
            {
              icon: "🔍",
              color: "blue",
              title: "Structured metadata",
              desc: "Each chunk includes verdict, confidence score, manually_reviewed flag, and a full audit trail URL.",
            },
            {
              icon: "⚡",
              color: "purple",
              title: "Filter before retrieval",
              desc: "Use ?manually_reviewed=true or ?verdict=Supported to retrieve only the highest-trust claims.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5"
            >
              <div className={`text-2xl mb-2`}>{card.icon}</div>
              <div className="font-semibold text-white mb-1">{card.title}</div>
              <div className="text-sm text-gray-400">{card.desc}</div>
            </div>
          ))}
        </div>

        {/* Quick start */}
        <SectionHeading id="quickstart">Quick start — direct API</SectionHeading>
        <p className="text-gray-400 mb-4">
          The simplest integration: call <code className="text-blue-300 font-mono text-sm">/api/public/claims/search</code> directly.
          The new <code className="text-blue-300 font-mono text-sm">manually_reviewed</code> filter lets you retrieve
          only human-reviewed claims for maximum trust.
        </p>
        <CodeBlock code={DIRECT_API} language="python" />

        {/* LangChain */}
        <SectionHeading id="langchain">LangChain retriever</SectionHeading>
        <p className="text-gray-400 mb-4">
          Drop-in <code className="text-blue-300 font-mono text-sm">BaseRetriever</code> implementation.
          Compatible with <code className="text-blue-300 font-mono text-sm">RetrievalQA</code>,{" "}
          <code className="text-blue-300 font-mono text-sm">ConversationalRetrievalChain</code>, and any
          LangChain chain that accepts a retriever.
        </p>
        <CodeBlock code={LANGCHAIN_RETRIEVER} language="python" />

        {/* LlamaIndex */}
        <SectionHeading id="llamaindex">LlamaIndex retriever</SectionHeading>
        <p className="text-gray-400 mb-4">
          Implements <code className="text-blue-300 font-mono text-sm">BaseRetriever</code> for LlamaIndex.
          Returns <code className="text-blue-300 font-mono text-sm">NodeWithScore</code> objects with confidence
          scores mapped from the citation.is API, making them compatible with LlamaIndex rerankers and
          response synthesizers.
        </p>
        <CodeBlock code={LLAMAINDEX_RETRIEVER} language="python" />

        {/* OpenAI function calling */}
        <SectionHeading id="openai-functions">OpenAI function calling</SectionHeading>
        <p className="text-gray-400 mb-4">
          Register citation.is as a tool in the OpenAI function calling API. The model will call
          <code className="text-blue-300 font-mono text-sm"> search_verified_claims</code> when it needs
          to ground a response in verified evidence.
        </p>
        <CodeBlock code={OPENAI_FUNCTION} language="python" />

        {/* Filter reference */}
        <SectionHeading id="filters">Filter reference</SectionHeading>
        <p className="text-gray-400 mb-4">
          All filters work on both <code className="text-blue-300 font-mono text-sm">/api/public/claims</code> (paginated)
          and <code className="text-blue-300 font-mono text-sm">/api/public/claims/search</code> (full-text search).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 pr-6 text-gray-400 font-medium">Parameter</th>
                <th className="text-left py-2 pr-6 text-gray-400 font-medium">Type</th>
                <th className="text-left py-2 text-gray-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {[
                ["q", "string", "Full-text search query (search endpoint only)"],
                ["verdict", "string", "Filter by verdict: Supported | Contradicted | Insufficient Evidence"],
                ["vertical", "string", "Filter by domain: structural_biology | salmon_biotech | biology | medicine | ..."],
                ["manually_reviewed", "boolean", "true = only human-reviewed claims (overriddenVerdict IS NOT NULL)"],
                ["claim_type", "string", "Filter by claim type: resolution | pdb_id | gene_expression | ..."],
                ["updated_since", "ISO 8601 date", "Only claims updated after this date"],
                ["page", "integer", "Page number (1-based, default 1)"],
                ["page_size", "integer", "Results per page (default 100, max 500)"],
              ].map(([param, type, desc]) => (
                <tr key={param}>
                  <td className="py-2 pr-6 font-mono text-blue-300 text-xs">{param}</td>
                  <td className="py-2 pr-6 text-gray-500 text-xs">{type}</td>
                  <td className="py-2 text-gray-400 text-xs">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trust tiers */}
        <SectionHeading id="trust-tiers">Trust tiers for RAG</SectionHeading>
        <p className="text-gray-400 mb-4">
          Use filter combinations to select the appropriate trust tier for your application:
        </p>
        <div className="space-y-3">
          {[
            {
              tier: "Tier 1 — Highest trust",
              badge: "bg-green-900/40 text-green-400 border-green-800",
              filter: "?manually_reviewed=true&verdict=Supported",
              desc: "Human-reviewed, deterministically verified. Use for medical, legal, or high-stakes applications.",
            },
            {
              tier: "Tier 2 — High trust",
              badge: "bg-blue-900/40 text-blue-400 border-blue-800",
              filter: "?verdict=Supported",
              desc: "Algorithmically verified against primary sources. Suitable for most scientific RAG applications.",
            },
            {
              tier: "Tier 3 — All claims",
              badge: "bg-gray-800 text-gray-400 border-gray-700",
              filter: "(no filter)",
              desc: "Includes Supported, Contradicted, and Insufficient Evidence. Use when you want the model to reason about uncertainty.",
            },
          ].map((t) => (
            <div
              key={t.tier}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-start gap-4"
            >
              <span className={`text-xs font-mono border px-2 py-0.5 rounded whitespace-nowrap mt-0.5 ${t.badge}`}>
                {t.tier}
              </span>
              <div>
                <code className="text-blue-300 font-mono text-xs">{t.filter}</code>
                <p className="text-gray-400 text-sm mt-1">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* MCP alternative */}
        <SectionHeading id="mcp">Prefer MCP?</SectionHeading>
        <p className="text-gray-400 mb-4">
          If your agent framework supports the{" "}
          <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
            Model Context Protocol
          </a>
          , you can connect citation.is directly as an MCP server. The{" "}
          <code className="text-blue-300 font-mono text-sm">search_claims</code> and{" "}
          <code className="text-blue-300 font-mono text-sm">get_claim</code> tools provide the same
          retrieval capability with a structured tool-call interface.
        </p>
        <div className="flex gap-3">
          <Link
            href="/developers/mcp"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            MCP Server docs →
          </Link>
          <a
            href="/.well-known/mcp.json"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            MCP manifest ↗
          </a>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-gray-800 flex items-center justify-between text-sm text-gray-500">
          <Link href="/developers" className="hover:text-gray-300">
            ← Developer Hub
          </Link>
          <div className="flex gap-6">
            <Link href="/developers/mcp" className="hover:text-gray-300">MCP Server</Link>
            <Link href="/developers/slm" className="hover:text-gray-300">SLM</Link>
            <a href="/api/public/claims/search?q=protein+structure&page_size=3" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
              Live API ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
