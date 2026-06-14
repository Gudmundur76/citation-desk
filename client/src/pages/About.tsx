import { Link } from 'react-router-dom'
import { ArrowRight, Database, Search, BarChart2, Shield, Code2, RefreshCw } from 'lucide-react'

const FEATURES = [
  {
    icon: Database,
    title: 'Authoritative Sources',
    desc: 'Claims are cross-referenced against the RCSB Protein Data Bank, PubMed, and domain-specific registries — not LLM hallucinations.',
  },
  {
    icon: Search,
    title: 'Full-Text Search',
    desc: 'Search across extracted claims with relevance ranking, verdict filtering, and domain scoping. Corpus grows autonomously.',
  },
  {
    icon: BarChart2,
    title: 'Domain Verticals',
    desc: 'Each vertical is a purpose-built verification engine: Structural Biology, Salmon Biotech, and more in development.',
  },
  {
    icon: Shield,
    title: 'Confidence Scoring',
    desc: 'Every claim carries a confidence score derived from evidence completeness, source authority, and method reproducibility.',
  },
]

export function About() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-4">
            Infrastructure
          </div>
          <h1
            className="text-4xl font-bold text-slate-900 mb-4"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}
          >
            What is citation.is?
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            citation.is is the verification primitive for AI agents — infrastructure for scientific claim
            verification, not a product. Like CrossRef for DOIs, but for claims. Any AI system can call
            citation.is before returning a factual statement and receive a structured, evidence-grounded
            verdict in milliseconds.
          </p>
        </div>

        {/* Founder */}
        <div className="mb-16 border border-slate-200 rounded-2xl p-8">
          <h2
            className="text-xl font-bold text-slate-900 mb-4"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Founder
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>G</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Syne, sans-serif' }}>
                Gudmundur Eyberg Kristjansson
              </p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Previously founder of{' '}
                <a
                  href="https://iventure.studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 underline hover:text-slate-900"
                >
                  Iventure.studio
                </a>
                , an AI venture studio. citation.is is his current project — building the verification
                layer that every AI system will eventually need. Based in Iceland.
              </p>
              <p className="text-sm text-slate-400 mt-3">
                Contact:{' '}
                <Link to="/contact" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  citation.is/contact
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-16">
          <h2
            className="text-xl font-bold text-slate-900 mb-6"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            How it works
          </h2>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Ingest', desc: 'Research papers are fetched continuously from PubMed Central, bioRxiv, and open-access repositories. The corpus grows autonomously.' },
              { step: '02', title: 'Extract', desc: 'An LLM pipeline extracts discrete, verifiable claims from each document with entity resolution against UniProt, PubChem, and NCBI.' },
              { step: '03', title: 'Verify', desc: 'Each claim is routed to the appropriate authoritative database (PDB, PubChem, ClinicalTrials.gov, etc.) for evidence lookup.' },
              { step: '04', title: 'Verdict', desc: 'Claims receive one of seven verdicts (Supported, Partially Supported, Ambiguous, Contradicted, Insufficient Evidence, Out of Scope, or Needs Expert Review) with a confidence score and provenance chain.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div
                  className="text-2xl font-bold text-slate-200 shrink-0 w-10 text-right"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                >
                  {step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2
            className="text-xl font-bold text-slate-900 mb-6"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Platform features
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-xl p-5">
                <Icon className="w-4 h-4 text-slate-500 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm mb-1.5" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vision */}
        <div className="mb-16 border-l-4 border-emerald-400 pl-6">
          <h2
            className="text-xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Vision
          </h2>
          <p className="text-slate-500 leading-relaxed mb-3">
            The scientific literature is the most authoritative knowledge base humanity has ever
            produced. But it is locked in PDFs, inaccessible to AI systems at query time. citation.is
            unlocks it — extracting, verifying, and serving claims as structured data that any model
            can consume.
          </p>
          <p className="text-slate-500 leading-relaxed">
            The goal is to become the verification primitive that sits under every AI system that
            makes factual claims about science — from AI search engines to regulatory compliance tools
            to academic publishing workflows.
          </p>
        </div>

        {/* Infrastructure */}
        <div className="mb-16 p-6 bg-slate-900 rounded-2xl text-white">
          <h2
            className="text-lg font-bold mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Infrastructure Layer
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            citation.is exposes a native MCP server, a full public REST API, and structured ClaimReview
            JSON-LD on every claim page. Any MCP-compatible agent can call{' '}
            <span className="text-slate-200 font-mono">citation.is/mcp</span> and verify claims
            natively. OpenAPI spec and llms.txt are published for AI crawler discovery.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/mcp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Code2 className="w-3 h-3" />
              MCP Server
            </a>
            <a
              href="/developers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              REST API
            </a>
            <a
              href="/llms.txt"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
            >
              llms.txt
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link
            to="/developers"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Code2 className="w-4 h-4" />
            API Docs
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-400 transition-colors"
          >
            Get in touch <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/loop"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Live Loop
          </Link>
        </div>
      </div>
    </div>
  )
}
