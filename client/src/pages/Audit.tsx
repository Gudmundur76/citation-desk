import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckCircle, AlertCircle, FileText, Zap, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { api, type AuditRequestInput } from '@/lib/api'
import { trpc } from '@/lib/trpc'

const TIERS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    icon: FileText,
    description: 'Single document, up to 20 claims extracted and verified.',
    turnaround: '48 hours',
  },
  {
    id: 'diligence' as const,
    name: 'Diligence',
    icon: Zap,
    description: 'Up to 5 documents, full claim graph, contradiction detection.',
    turnaround: '5 business days',
  },
  {
    id: 'platform_pilot' as const,
    name: 'Platform Pilot',
    icon: Shield,
    description: 'Ongoing monitoring, API access, custom vertical configuration.',
    turnaround: 'Ongoing',
  },
]

export function Audit() {
  const [tier, setTier] = useState<AuditRequestInput['tier']>('starter')
  const [form, setForm] = useState({
    contactName: '',
    contactEmail: '',
    organization: '',
    documentDescription: '',
    additionalNotes: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [requestId, setRequestId] = useState<number | null>(null)

  const utils = trpc.useUtils()
  const ownerNotify = trpc.system.notifyOwner.useMutation()

  const mutation = useMutation({
    mutationFn: (input: AuditRequestInput) => api.submitAuditRequest(input),
    onSuccess: async (data) => {
      setRequestId(data.requestId)
      setSubmitted(true)

      // 1. In-app toast
      toast.success('Audit request submitted!', {
        description: `Reference #${data.requestId} — we'll be in touch soon.`,
        duration: 6000,
      })

      // 2. Owner notification (fire-and-forget — non-blocking)
      ownerNotify.mutate(
        {
          title: `New audit request #${data.requestId}`,
          content: `Tier: ${tier} | From: ${form.contactName} <${form.contactEmail}>${form.organization ? ` @ ${form.organization}` : ''}\n\n${form.documentDescription}`,
        },
        {
          onError: (err) => console.error('[Audit] Owner notify failed:', err),
        }
      )

      // 3. Refresh notification bell if the user is logged in
      utils.notifications.unreadCount.invalidate()
      utils.notifications.list.invalidate()
    },
    onError: (err) => {
      toast.error('Submission failed', {
        description: (err as Error).message ?? 'Please try again.',
      })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate({
      tier,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      organization: form.organization || undefined,
      documentDescription: form.documentDescription,
      additionalNotes: form.additionalNotes || undefined,
    })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h2
            className="text-2xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Request received
          </h2>
          <p className="text-slate-500 text-sm mb-2">
            Your audit request has been submitted successfully.
          </p>
          {requestId && (
            <p className="text-xs text-slate-400 font-mono mb-6">
              Reference ID: #{requestId}
            </p>
          )}
          <p className="text-xs text-slate-400">
            We'll be in touch at the email you provided.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-slate-900 mb-2"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Request an Audit
          </h1>
          <p className="text-sm text-slate-500">
            Submit a research paper, pitch deck, or whitepaper for claim extraction and verification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tier selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Audit Tier
            </label>
            <div className="grid sm:grid-cols-3 gap-3">
              {TIERS.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      tier === t.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${tier === t.id ? 'text-white' : 'text-slate-400'}`} />
                    <div className={`font-bold text-sm mb-1 ${tier === t.id ? 'text-white' : 'text-slate-900'}`}
                      style={{ fontFamily: 'Syne, sans-serif' }}>
                      {t.name}
                    </div>
                    <div className={`text-xs leading-relaxed ${tier === t.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {t.description}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${tier === t.id ? 'text-slate-400' : 'text-slate-400'}`}>
                      {t.turnaround}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                placeholder="Dr. Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                placeholder="jane@university.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Organization
            </label>
            <input
              type="text"
              value={form.organization}
              onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
              placeholder="University / Company"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Document Description <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              minLength={10}
              value={form.documentDescription}
              onChange={e => setForm(f => ({ ...f, documentDescription: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 resize-none"
              placeholder="Describe the document(s) you'd like audited — topic, type (paper/deck/patent), and what claims you're most concerned about…"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Additional Notes
            </label>
            <textarea
              value={form.additionalNotes}
              onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400 resize-none"
              placeholder="Anything else we should know…"
            />
          </div>

          {mutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {(mutation.error as Error).message ?? 'Submission failed. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit Audit Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
