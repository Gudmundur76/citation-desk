/**
 * /pricing — Citation.is commercial plans
 *
 * Three tiers:
 *   Starter    $1,500/year  — 10 audits, single-document, 48h turnaround
 *   Diligence  $5,000/year  — 50 audits, multi-document, contradiction detection
 *   Platform   Custom       — unlimited, API access, ongoing monitoring
 *
 * Checkout flow (Starter / Diligence):
 *   1. User clicks "Get started" → email input modal opens
 *   2. trpc.checkout.createOrder → PayPal order created, user redirected to PayPal
 *   3. PayPal redirects back to /pricing?token=ORDER_ID&PayerID=...
 *   4. trpc.checkout.captureOrder → subscription activated
 *   5. Success state shown with plan details
 */

import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { CheckCircle, Zap, Shield, FileText, ArrowRight, Loader2, AlertCircle, X } from 'lucide-react'

type PlanTier = 'starter' | 'diligence' | 'platform'

interface Plan {
  id: PlanTier
  name: string
  price: string
  period: string
  tagline: string
  icon: typeof FileText
  features: string[]
  cta: string
  highlight: boolean
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$1,500',
    period: '/year',
    tagline: 'For individual researchers and small teams.',
    icon: FileText,
    features: [
      '10 document audits per year',
      'Up to 20 claims extracted per document',
      'Seven-verdict classification',
      'UniProt, PubChem, NCBI evidence check',
      'PDF audit report per document',
      '48-hour turnaround',
      'Email support',
    ],
    cta: 'Get started',
    highlight: false,
  },
  {
    id: 'diligence',
    name: 'Diligence',
    price: '$5,000',
    period: '/year',
    tagline: 'For biotech companies and CROs doing due diligence.',
    icon: Zap,
    features: [
      '50 document audits per year',
      'Up to 5 documents per batch',
      'Full claim knowledge graph',
      'Contradiction detection across documents',
      'Confidence trend sparklines',
      'Evidence timeline per claim',
      '5-business-day turnaround',
      'Priority email support',
    ],
    cta: 'Get started',
    highlight: true,
  },
  {
    id: 'platform',
    name: 'Platform',
    price: 'Custom',
    period: '',
    tagline: 'For enterprise teams needing ongoing monitoring.',
    icon: Shield,
    features: [
      'Unlimited audits',
      'API access (REST + MCP)',
      'Custom vertical configuration',
      'Ongoing claim monitoring',
      'Webhook notifications',
      'Dedicated onboarding',
      'SLA guarantee',
      'Custom contract',
    ],
    cta: 'Contact us',
    highlight: false,
  },
]

// ── Email capture modal ──────────────────────────────────────────────────────

function EmailModal({
  plan,
  onClose,
  onSubmit,
  isPending,
  error,
}: {
  plan: Plan
  onClose: () => void
  onSubmit: (email: string) => void
  isPending: boolean
  error: string | null
}) {
  const [email, setEmail] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
            Start {plan.name} plan
          </h2>
          <p className="text-sm text-slate-500">
            Enter your email to proceed to PayPal checkout. Your subscription will be linked to this email.
          </p>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault()
            onSubmit(email)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !email}
            className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to PayPal…
              </>
            ) : (
              <>
                Continue to PayPal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Secure payment via PayPal. You'll be redirected to PayPal to complete your purchase.
          </p>
        </form>
      </div>
    </div>
  )
}

// ── Success state ────────────────────────────────────────────────────────────

function SuccessPanel({
  planTier,
  email,
  auditsLimit,
  expiresAt,
}: {
  planTier: string
  email: string
  auditsLimit: number
  expiresAt: string | null
}) {
  const planName = PLANS.find(p => p.id === planTier)?.name ?? planTier
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
          Welcome to citation.is {planName}!
        </h1>
        <p className="text-slate-500 text-sm mb-2">
          Your subscription is now active for <strong className="text-slate-700">{email}</strong>.
        </p>
        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Plan</span>
            <span className="font-semibold text-slate-900">{planName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Audits included</span>
            <span className="font-semibold text-slate-900">{auditsLimit === 9999 ? 'Unlimited' : auditsLimit}</span>
          </div>
          {expiry && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Valid until</span>
              <span className="font-semibold text-slate-900">{expiry}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-6">
          A confirmation has been sent to your email. To submit your first audit, visit the Audit page.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/audit"
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Submit an audit
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Go to registry
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main Pricing page ────────────────────────────────────────────────────────

export function Pricing() {
  const [searchParams] = useSearchParams()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [captureResult, setCaptureResult] = useState<{
    planTier: string; email: string; auditsLimit: number; expiresAt: string | null
  } | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const createOrder = trpc.checkout.createOrder.useMutation({
    onSuccess: ({ approvalUrl }) => {
      // Redirect to PayPal
      window.location.href = approvalUrl
    },
    onError: err => {
      setCheckoutError(err.message)
    },
  })

  const captureOrder = trpc.checkout.captureOrder.useMutation({
    onSuccess: data => {
      setCaptureResult(data)
      setIsCapturing(false)
    },
    onError: err => {
      setCaptureError(err.message)
      setIsCapturing(false)
    },
  })

  // Handle PayPal return redirect: ?token=ORDER_ID&PayerID=...
  useEffect(() => {
    const token = searchParams.get('token')
    const payerId = searchParams.get('PayerID')
    if (token && payerId && !isCapturing && !captureResult) {
      setIsCapturing(true)
      captureOrder.mutate({ orderId: token })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePlanCta(plan: Plan) {
    if (plan.id === 'platform') {
      window.location.href = 'mailto:hello@citation.is?subject=Platform%20Plan%20Inquiry'
      return
    }
    setCheckoutError(null)
    setSelectedPlan(plan)
  }

  function handleEmailSubmit(email: string) {
    if (!selectedPlan) return
    const origin = window.location.origin
    createOrder.mutate({
      planTier: selectedPlan.id,
      email,
      returnUrl: `${origin}/pricing`,
      cancelUrl: `${origin}/pricing?cancelled=1`,
    })
  }

  // Show capture loading state
  if (isCapturing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Activating your subscription…</p>
        </div>
      </div>
    )
  }

  // Show capture error
  if (captureError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
            Payment capture failed
          </h1>
          <p className="text-slate-500 text-sm mb-6">{captureError}</p>
          <Link to="/pricing" className="text-sm text-slate-700 underline">
            Try again
          </Link>
        </div>
      </div>
    )
  }

  // Show success after capture
  if (captureResult) {
    return <SuccessPanel {...captureResult} />
  }

  // Show cancellation notice
  const wasCancelled = searchParams.get('cancelled') === '1'

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Commercial plans
        </div>
        <h1
          className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          Verify claims at scale
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Submit research papers, pitch decks, and whitepapers for autonomous claim extraction and verification against UniProt, PubChem, NCBI, and PubMed.
        </p>

        {wasCancelled && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Payment was cancelled. Choose a plan below to try again.
          </div>
        )}
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 flex flex-col transition-shadow ${
                  plan.highlight
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                    : 'border-slate-200 bg-white hover:shadow-md'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-accent text-white text-xs font-bold rounded-full"
                      style={{ background: 'oklch(0.55 0.18 250)' }}>
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    plan.highlight ? 'bg-white/10' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${plan.highlight ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  <h2
                    className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}
                    style={{ fontFamily: 'Syne, sans-serif' }}
                  >
                    {plan.name}
                  </h2>
                  <p className={`text-sm ${plan.highlight ? 'text-slate-300' : 'text-slate-500'}`}>
                    {plan.tagline}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-sm ${plan.highlight ? 'text-slate-400' : 'text-slate-400'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        plan.highlight ? 'text-emerald-400' : 'text-emerald-500'
                      }`} />
                      <span className={plan.highlight ? 'text-slate-200' : 'text-slate-600'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanCta(plan)}
                  className={`w-full py-3 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    plan.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-100'
                      : 'bg-slate-900 text-white hover:bg-slate-700'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Trust signals */}
        <div className="mt-12 pt-10 border-t border-slate-100">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { label: 'Claims verified', value: '4,000+' },
              { label: 'Authoritative databases', value: '5' },
              { label: 'Uptime target', value: '99.5%' },
            ].map(stat => (
              <div key={stat.label}>
                <div
                  className="text-2xl font-bold text-slate-900 mb-1"
                  style={{ fontFamily: 'Syne, sans-serif' }}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 pt-10 border-t border-slate-100">
          <h2
            className="text-xl font-bold text-slate-900 mb-6 text-center"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Common questions
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                q: 'What counts as an "audit"?',
                a: 'One audit = one document submission. We extract all verifiable claims, check them against authoritative databases, and return a full verdict report.',
              },
              {
                q: 'Which databases do you check against?',
                a: 'UniProt (proteins), PubChem (compounds), NCBI Taxonomy (organisms), RCSB PDB (structures), and PubMed (literature). More databases are added regularly.',
              },
              {
                q: 'How is payment processed?',
                a: 'Payments are processed securely via PayPal. You can pay with a PayPal account or any major credit card. We never store your payment details.',
              },
              {
                q: 'Can I upgrade my plan?',
                a: 'Yes. Contact us at hello@citation.is and we will prorate the upgrade. Unused audits carry over.',
              },
            ].map(item => (
              <div key={item.q}>
                <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{item.q}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Email modal */}
      {selectedPlan && (
        <EmailModal
          plan={selectedPlan}
          onClose={() => { setSelectedPlan(null); setCheckoutError(null) }}
          onSubmit={handleEmailSubmit}
          isPending={createOrder.isPending}
          error={checkoutError}
        />
      )}
    </div>
  )
}
