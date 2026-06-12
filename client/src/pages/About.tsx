import { useNavigate } from 'react-router-dom'
import { ArrowRight, Database, Search, BarChart2, Shield } from 'lucide-react'

const FEATURES = [
  {
    icon: Database,
    title: 'Authoritative Sources',
    desc: 'Claims are cross-referenced against the RCSB Protein Data Bank, PubMed, and domain-specific registries — not LLM hallucinations.',
  },
  {
    icon: Search,
    title: 'Full-Text Search',
    desc: 'Search across 3,900+ extracted claims with relevance ranking, verdict filtering, and domain scoping.',
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
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <h1
            className="text-4xl font-bold text-slate-900 mb-4"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.03em' }}
          >
            What is citation.is?
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            citation.is is an autonomous scientific claim verification registry. It monitors research
            literature, extracts molecular and biological claims, and validates each one against
            authoritative databases — delivering a permanent, citable record of what the evidence
            actually says.
          </p>
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
              { step: '01', title: 'Ingest', desc: 'Research papers are fetched from PubMed and other open-access sources, or submitted directly.' },
              { step: '02', title: 'Extract', desc: 'An LLM pipeline extracts discrete, verifiable claims from each document.' },
              { step: '03', title: 'Verify', desc: 'Each claim is routed to the appropriate authoritative database (PDB, PubChem, ClinicalTrials.gov, etc.) for evidence lookup.' },
              { step: '04', title: 'Verdict', desc: 'Claims receive a verdict (Supported / Refuted / Ambiguous / Insufficient Evidence) with a confidence score and provenance chain.' },
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

        {/* Backend */}
        <div className="mb-16 p-6 bg-slate-900 rounded-2xl text-white">
          <h2
            className="text-lg font-bold mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Verification Engine
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            The verification engine exposes a full public REST and tRPC API for search, verticals,
            leaderboard, and claim provenance — all available at{' '}
            <a href="https://citation.is/developers" className="text-slate-300 underline hover:text-white">
              citation.is/developers
            </a>.
          </p>
          <div className="font-mono text-xs text-slate-500 bg-slate-800 rounded-lg px-3 py-2">
            https://citation.is/api/public/claims
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/search')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Search claims <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/audit')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-400 transition-colors"
          >
            Request an audit <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
