/**
 * /pricing — Citation.is access tiers
 *
 * Currently free and open. Commercial plans will be introduced in a future release.
 */

import { Link } from 'react-router-dom'
import { CheckCircle, FileText, Zap, Shield, ArrowRight, Mail } from 'lucide-react'

const TIERS = [
  {
    id: 'open',
    name: 'Open Access',
    price: 'Free',
    period: '',
    tagline: 'Full access for researchers, scientists, and curious minds.',
    icon: FileText,
    features: [
      'Search 3,900+ verified claims',
      'Seven-verdict classification',
      'UniProt, PubChem, NCBI evidence links',
      'Claim confidence scores',
      'Embed badges on any webpage',
      'Download PDF audit reports',
      'API access (read-only)',
      'No account required',
    ],
    cta: 'Start searching',
    ctaHref: '/',
    highlight: false,
    badge: null,
  },
  {
    id: 'audit',
    name: 'Audit Request',
    price: 'Free',
    period: 'during beta',
    tagline: 'Submit a document for autonomous claim extraction and verification.',
    icon: Zap,
    features: [
      'Upload research papers or pitch decks',
      'Automated claim extraction',
      'Cross-reference against live databases',
      'Contradiction detection',
      'Full audit report in registry',
      'Priority queue during beta',
    ],
    cta: 'Request an audit',
    ctaHref: '/audit',
    highlight: true,
    badge: 'Beta — free now',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Coming soon',
    period: '',
    tagline: 'High-volume API access, custom verticals, and SLA for teams.',
    icon: Shield,
    features: [
      'Bulk document processing',
      'REST + MCP API access',
      'Custom vertical configuration',
      'Ongoing claim monitoring',
      'Webhook notifications',
      'Dedicated onboarding & SLA',
    ],
    cta: 'Get notified',
    ctaHref: 'mailto:hello@citation.is?subject=Enterprise%20Access',
    highlight: false,
    badge: null,
  },
]

export function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full text-xs font-semibold text-emerald-700 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Free during beta
        </div>
        <h1
          className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Open access, no strings attached
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          citation.is is free to use during our public beta. Search, verify, embed, and audit — all at no cost.
        </p>
      </div>

      {/* Tier cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map(tier => {
            const Icon = tier.icon
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border p-8 flex flex-col transition-shadow ${
                  tier.highlight
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                    : 'border-slate-200 bg-white hover:shadow-md'
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="px-3 py-1 text-white text-xs font-bold rounded-full"
                      style={{ background: 'oklch(0.55 0.18 250)' }}
                    >
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                      tier.highlight ? 'bg-white/10' : 'bg-slate-100'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${tier.highlight ? 'text-white' : 'text-slate-700'}`}
                    />
                  </div>
                  <h2
                    className={`text-xl font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-slate-900'}`}
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    {tier.name}
                  </h2>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className={`text-3xl font-extrabold ${tier.highlight ? 'text-white' : 'text-slate-900'}`}
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span
                        className={`text-sm ${tier.highlight ? 'text-white/60' : 'text-slate-400'}`}
                      >
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${tier.highlight ? 'text-white/70' : 'text-slate-500'}`}
                  >
                    {tier.tagline}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          tier.highlight ? 'text-emerald-400' : 'text-emerald-500'
                        }`}
                      />
                      <span
                        className={`text-sm ${tier.highlight ? 'text-white/80' : 'text-slate-600'}`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {tier.ctaHref.startsWith('mailto:') ? (
                  <a
                    href={tier.ctaHref}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                      tier.highlight
                        ? 'bg-white text-slate-900 hover:bg-slate-100'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    {tier.cta}
                  </a>
                ) : (
                  <Link
                    to={tier.ctaHref}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                      tier.highlight
                        ? 'bg-white text-slate-900 hover:bg-slate-100'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    {tier.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* FAQ strip */}
      <div className="border-t border-slate-100 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <h2
            className="text-2xl font-bold text-slate-900 mb-8 text-center"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Common questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'Is it really free?',
                a: 'Yes. During our public beta, all features are free with no credit card required. We will introduce commercial plans for high-volume and enterprise use cases in the future.',
              },
              {
                q: 'How do I submit a document for audit?',
                a: 'Go to the Audit page, paste a DOI or upload a PDF, and the pipeline will extract and verify claims automatically. Results appear in the Registry within minutes.',
              },
              {
                q: 'Can I embed a verified claim badge on my website?',
                a: 'Yes. Open any claim in the Registry, scroll to the Export & Embed panel, and copy the HTML or Markdown snippet. The badge updates automatically as the claim is re-verified.',
              },
              {
                q: 'When will enterprise plans be available?',
                a: 'We are targeting Q3 2026 for the first commercial tier. Sign up for early access by emailing hello@citation.is.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-slate-200 pb-6 last:border-0 last:pb-0">
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{q}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA footer */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h2
            className="text-2xl font-bold mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Ready to verify your first claim?
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            No account needed. Search 3,900+ verified claims or submit a document right now.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-white text-slate-900 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors"
            >
              Search the registry
            </Link>
            <Link
              to="/audit"
              className="px-6 py-3 border border-white/20 text-white font-semibold text-sm rounded-xl hover:bg-white/10 transition-colors"
            >
              Submit an audit
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
