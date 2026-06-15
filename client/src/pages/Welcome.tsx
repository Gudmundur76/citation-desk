import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle, Search, Database, ArrowRight, ArrowLeft,
  Zap, Shield, BookOpen, Code2, ChevronRight
} from 'lucide-react'

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    label: 'What is citation.is',
    title: 'An open registry of verified scientific claims',
    subtitle:
      'citation.is is a machine-readable knowledge base that tells you — with evidence — whether a scientific claim is supported, refuted, ambiguous, or beyond current evidence.',
    visual: <StepOneVisual />,
    cta: 'How does it work?',
  },
  {
    id: 2,
    label: 'How it works',
    title: 'Every claim is verified against primary databases',
    subtitle:
      'When a document is submitted, our 8-stage pipeline extracts every factual claim, resolves entities against RCSB PDB, UniProt, PubMed, and PubChem, then assigns a composite truth score with full provenance.',
    visual: <StepTwoVisual />,
    cta: 'Try a search',
  },
  {
    id: 3,
    label: 'Try it',
    title: 'Search the knowledge base',
    subtitle:
      'Start with a topic you know well. Find claims, see the evidence, and follow the citation chain.',
    visual: <StepThreeVisual />,
    cta: 'Go to Search',
  },
]

// ─── Step 1 visual: verdict taxonomy ─────────────────────────────────────────

function StepOneVisual() {
  const verdicts = [
    {
      label: 'Supported',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      dot: 'bg-emerald-500',
      desc: 'Primary database evidence confirms the claim.',
    },
    {
      label: 'Refuted',
      color: 'bg-red-50 border-red-200 text-red-700',
      dot: 'bg-red-500',
      desc: 'Evidence directly contradicts the claim.',
    },
    {
      label: 'Ambiguous',
      color: 'bg-amber-50 border-amber-200 text-amber-700',
      dot: 'bg-amber-500',
      desc: 'Conflicting evidence — no clear verdict.',
    },
    {
      label: 'Insufficient Evidence',
      color: 'bg-slate-50 border-slate-200 text-slate-500',
      dot: 'bg-slate-400',
      desc: 'Not enough primary data to decide.',
    },
    {
      label: 'Out of Scope',
      color: 'bg-slate-50 border-slate-200 text-slate-500',
      dot: 'bg-slate-300',
      desc: 'Outside the platform\'s verification domain.',
    },
    {
      label: 'Needs Expert Review',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
      dot: 'bg-purple-400',
      desc: 'Requires domain expert interpretation.',
    },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {verdicts.map(v => (
        <div
          key={v.label}
          className={`flex items-start gap-3 p-3 rounded-xl border ${v.color}`}
        >
          <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${v.dot}`} />
          <div>
            <p className="text-sm font-semibold leading-tight">{v.label}</p>
            <p className="text-xs mt-0.5 opacity-70">{v.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Step 2 visual: pipeline stages ──────────────────────────────────────────

function StepTwoVisual() {
  const stages = [
    { icon: BookOpen, label: 'Extract claims', desc: 'LLM extracts every factual assertion' },
    { icon: Database, label: 'Resolve entities', desc: 'PDB, UniProt, PubMed, PubChem' },
    { icon: Shield, label: 'Validate evidence', desc: 'Primary database lookup' },
    { icon: Zap, label: 'Score & publish', desc: 'Composite truth score + provenance' },
  ]
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const Icon = s.icon
        return (
          <div key={s.label} className="flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
            </div>
            {i < stages.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 3 visual: example search queries ────────────────────────────────────

function StepThreeVisual() {
  const examples = [
    { query: 'lysozyme inhibits bacterial cell wall synthesis', verdict: 'Supported', conf: 0.94 },
    { query: 'salmon omega-3 reduces cardiovascular risk', verdict: 'Ambiguous', conf: 0.61 },
    { query: 'Akkermansia muciniphila improves gut barrier function', verdict: 'Supported', conf: 0.91 },
  ]
  const VERDICT_COLORS: Record<string, string> = {
    Supported: 'text-emerald-600 bg-emerald-50',
    Ambiguous: 'text-amber-600 bg-amber-50',
    Refuted: 'text-red-600 bg-red-50',
  }
  return (
    <div className="space-y-3">
      {examples.map(e => (
        <div
          key={e.query}
          className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white"
        >
          <Search className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 leading-snug truncate">{e.query}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${VERDICT_COLORS[e.verdict] ?? 'text-slate-500 bg-slate-50'}`}
            >
              {e.verdict}
            </span>
            <span className="text-xs text-slate-400 font-mono">{e.conf}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'w-8 bg-slate-900'
              : i + 1 < current
              ? 'w-4 bg-slate-400'
              : 'w-4 bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Welcome() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const current = STEPS[step - 1]

  function handleNext() {
    if (step < STEPS.length) {
      setStep(s => s + 1)
    } else {
      // Mark onboarding complete in localStorage so we don't show it again
      try {
        localStorage.setItem('citation_onboarded', '1')
      } catch {
        // ignore
      }
      navigate('/search')
    }
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1)
  }

  function handleSkip() {
    try {
      localStorage.setItem('citation_onboarded', '1')
    } catch {
      // ignore
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span
                className="text-white text-sm font-bold"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                C
              </span>
            </div>
            <span
              className="text-slate-900 font-bold text-base"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              citation.is
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip intro
          </button>
        </div>

        {/* Step breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`text-xs font-medium transition-colors ${
                s.id === step ? 'text-slate-900' : 'text-slate-300'
              }`}
            >
              {s.label}
              {i < STEPS.length - 1 && (
                <span className="ml-2 text-slate-200">›</span>
              )}
            </span>
          ))}
        </div>

        {/* Content card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm mb-8">
          {/* Title */}
          <h1
            className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 leading-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            {current.title}
          </h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            {current.subtitle}
          </p>

          {/* Visual */}
          <div className="mb-2">
            {current.visual}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-6">
            <StepIndicator current={step} total={STEPS.length} />
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
            >
              {step === STEPS.length ? (
                <>
                  <Search className="w-4 h-4" />
                  Go to Search
                </>
              ) : (
                <>
                  {current.cta}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Completion indicator on last step */}
        {step === STEPS.length && (
          <div className="mt-6 flex items-center gap-2 text-xs text-emerald-600 justify-center">
            <CheckCircle className="w-4 h-4" />
            <span>You're all set — the knowledge base is ready to explore.</span>
          </div>
        )}
      </div>
    </div>
  )
}
