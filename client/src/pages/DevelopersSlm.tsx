/**
 * DevelopersSlm.tsx
 *
 * /developers/slm — SLM Distillation Pipeline documentation page.
 *
 * Explains how the autonomous ingest loop continuously distils verified
 * claims into specialist small language models (SLMs) that enterprise AI
 * clients can download and run locally.
 */

import { useState } from "react";

// ── Code snippet helpers ──────────────────────────────────────────────────────

function CodeBlock({
  code,
  language = "bash",
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg bg-gray-950 border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <button
          onClick={copy}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-sm text-gray-100 font-mono overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
        {number}
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DevelopersSlm() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2 py-1 text-xs font-medium bg-purple-900 text-purple-300 rounded border border-purple-700">
              SLM Pipeline
            </span>
            <span className="px-2 py-1 text-xs font-medium bg-green-900 text-green-300 rounded border border-green-700">
              Auto-triggered
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            SLM Distillation Pipeline
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl">
            Every verified claim that enters the registry automatically feeds a
            training corpus. When a domain reaches sufficient density, a
            specialist small language model is distilled — a compact, auditable
            model that carries verified scientific knowledge in its weights.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* How it works */}
        <section>
          <SectionHeader
            number="01"
            title="How the pipeline works"
            subtitle="Four stages, fully autonomous — no manual intervention required"
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              {
                step: "Ingest",
                desc: "Enterprise MCP queries trigger live routing to PubMed, UniProt, and PDB",
                color: "blue",
              },
              {
                step: "Verify",
                desc: "Each extracted claim runs through the verdict engine and is written to the registry",
                color: "indigo",
              },
              {
                step: "Corpus",
                desc: "Verified claims are appended to a domain-specific JSONL training corpus",
                color: "purple",
              },
              {
                step: "Distil",
                desc: "When the corpus reaches the density threshold, an incremental fine-tune run is triggered automatically",
                color: "pink",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="p-4 rounded-lg border border-gray-800 bg-gray-900"
              >
                <div
                  className={`text-xs font-bold text-${s.color}-400 uppercase tracking-wider mb-2`}
                >
                  {s.step}
                </div>
                <p className="text-sm text-gray-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Training corpus format */}
        <section>
          <SectionHeader
            number="02"
            title="Training corpus format"
            subtitle="JSONL — one training pair per verified claim"
          />
          <CodeBlock
            language="jsonl"
            code={`{"instruction":"Classify the scientific claim as Supported, Refuted, Inconclusive, or Needs Context. Return the verdict and confidence score.","input":"BRCA1 protein is involved in DNA double-strand break repair via homologous recombination.","output":"Verdict: Supported\\nConfidence: 0.92","claimId":"ingest-1718000000000-a3f7b2","type":"classify"}
{"instruction":"Extract all scientific entities from the sentence. Return a JSON array with type, name, and canonical_id fields.","input":"BRCA1 protein is involved in DNA double-strand break repair via homologous recombination.","output":"[{\\"type\\":\\"protein\\",\\"name\\":\\"BRCA1\\",\\"canonical_id\\":\\"BRCA1\\"}]","claimId":"ingest-1718000000000-a3f7b2","type":"extract"}
{"instruction":"Explain the provenance chain: how was this claim verified?","input":"BRCA1 protein is involved in DNA double-strand break repair via homologous recombination.","output":"Claim verified via PubMed literature search. Evidence: PMID:12345678 — BRCA1 functions in homologous recombination-directed DNA damage repair. Source: https://pubmed.ncbi.nlm.nih.gov/12345678","claimId":"ingest-1718000000000-a3f7b2","type":"provenance"}`}
          />
        </section>

        {/* Density threshold */}
        <section>
          <SectionHeader
            number="03"
            title="Domain density threshold"
            subtitle="Training is triggered automatically when a domain accumulates sufficient verified claims"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Default threshold",
                value: "50 pairs",
                desc: "Minimum new training pairs before a run is triggered",
              },
              {
                label: "Training mode",
                value: "Incremental",
                desc: "Only trains on the delta since the last run — minutes, not hours",
              },
              {
                label: "Base model",
                value: "qwen2.5-coder:7b",
                desc: "Configurable via TRAINING_MODEL environment variable",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="p-4 rounded-lg border border-gray-800 bg-gray-900"
              >
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {m.label}
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {m.value}
                </div>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>
            ))}
          </div>
          <CodeBlock
            language="bash"
            code={`# Configure via environment variables
TRAINING_CORPUS_PATH=/data/training/claims_corpus.jsonl
TRAINING_MIN_PAIRS=50
TRAINING_MODEL=qwen2.5-coder:7b
TRAINING_OUTPUT_PATH=/data/training/output
FINETUNE_SCRIPT_PATH=/opt/citation-is/scripts/finetunePipeline.py`}
          />
        </section>

        {/* Using a distilled model */}
        <section>
          <SectionHeader
            number="04"
            title="Using a distilled model"
            subtitle="Download and run domain-specific SLMs locally via Ollama"
          />
          <CodeBlock
            language="bash"
            code={`# Pull the latest structural biology SLM
ollama pull citation-is/structural-biology-7b

# Run a claim verification query
ollama run citation-is/structural-biology-7b \\
  "Classify this claim: BRCA1 is a tumour suppressor involved in DNA repair."

# Output:
# Verdict: Supported
# Confidence: 0.91
# Provenance: PMID:12345678, UniProt:P38398`}
          />
          <div className="mt-4">
            <CodeBlock
              language="python"
              code={`import ollama

client = ollama.Client()

response = client.chat(
    model="citation-is/structural-biology-7b",
    messages=[{
        "role": "user",
        "content": "Classify this claim: BRCA1 is a tumour suppressor involved in DNA repair."
    }]
)

print(response["message"]["content"])
# Verdict: Supported
# Confidence: 0.91
# Provenance: PMID:12345678`}
            />
          </div>
        </section>

        {/* Available domains */}
        <section>
          <SectionHeader
            number="05"
            title="Available domains"
            subtitle="SLMs are distilled per domain as claim density grows"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Domain
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Primary sources
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[
                  {
                    domain: "Structural Biology",
                    sources: "PDB, UniProt, PubMed",
                    status: "Active",
                    statusColor: "green",
                  },
                  {
                    domain: "Molecular Biology",
                    sources: "PubMed, UniProt",
                    status: "Active",
                    statusColor: "green",
                  },
                  {
                    domain: "Clinical Research",
                    sources: "PubMed, ClinicalTrials.gov",
                    status: "Accumulating",
                    statusColor: "yellow",
                  },
                  {
                    domain: "Genomics",
                    sources: "NCBI, Ensembl, PubMed",
                    status: "Accumulating",
                    statusColor: "yellow",
                  },
                  {
                    domain: "Legal",
                    sources: "CourtListener, case law",
                    status: "Accumulating",
                    statusColor: "yellow",
                  },
                ].map((d) => (
                  <tr key={d.domain} className="hover:bg-gray-900">
                    <td className="py-3 px-4 text-white font-medium">
                      {d.domain}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{d.sources}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full bg-${d.statusColor}-900 text-${d.statusColor}-300 border border-${d.statusColor}-700`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why this matters */}
        <section className="p-6 rounded-xl border border-purple-800 bg-purple-950/30">
          <h3 className="text-lg font-bold text-white mb-3">
            Why distilled SLMs matter for enterprise AI
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            A general-purpose LLM answers scientific questions from parametric
            memory — knowledge baked in at training time that may be outdated,
            incomplete, or hallucinated. A citation.is SLM is different: it was
            trained exclusively on verified, peer-reviewed claims with full
            provenance chains. Every answer it gives can be traced back to a
            primary source.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed">
            For regulated industries — pharmaceutical, clinical, legal,
            financial — this auditability is not optional. It is a compliance
            requirement. citation.is SLMs are the only models that ship with a
            complete, queryable record of what they know and how they know it.
          </p>
        </section>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-gray-800">
          <a
            href="/developers/mcp"
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            ← MCP Integration
          </a>
          <a
            href="/developers"
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            Full API Reference →
          </a>
        </div>
      </div>
    </div>
  );
}
