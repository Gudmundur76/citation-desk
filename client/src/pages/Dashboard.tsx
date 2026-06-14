/**
 * /dashboard — Customer self-service dashboard
 *
 * Accessed by email lookup (no OAuth required for citation.is).
 * Shows:
 *   - Active subscription status (plan, audits used/limit, expiry)
 *   - API key management (list, generate, revoke)
 *   - Link to submit an audit
 *
 * No sensitive data is exposed without email verification because:
 *   - API keys show only the prefix (first 8 chars)
 *   - Subscription data is non-sensitive (plan name + counts)
 *   - Raw key is shown once at generation and never again
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import {
  Key, Plus, Trash2, Copy, CheckCircle, AlertCircle, Loader2,
  CreditCard, Calendar, BarChart2, ArrowRight, Eye, EyeOff, X
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function PlanBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    starter: 'bg-blue-50 text-blue-700 border-blue-200',
    diligence: 'bg-violet-50 text-violet-700 border-violet-200',
    platform: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  const labels: Record<string, string> = {
    starter: 'Starter',
    diligence: 'Diligence',
    platform: 'Platform',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[tier] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {labels[tier] ?? tier}
    </span>
  )
}

// ── New key modal ─────────────────────────────────────────────────────────────

function NewKeyModal({
  email,
  onClose,
  onCreated,
}: {
  email: string
  onClose: () => void
  onCreated: (rawKey: string, label: string) => void
}) {
  const [label, setLabel] = useState('')

  const generate = trpc.dashboard.generateApiKey.useMutation({
    onSuccess: data => {
      onCreated(data.rawKey, data.label)
    },
  })

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

        <h2 className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
          Generate API key
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Give this key a descriptive label so you can identify it later.
        </p>

        <form
          onSubmit={e => {
            e.preventDefault()
            generate.mutate({ email, label })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Key label
            </label>
            <input
              type="text"
              required
              maxLength={64}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Production, CI/CD, Research"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {generate.isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {generate.error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={generate.isPending || !label.trim()}
            className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generate.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Key className="w-4 h-4" /> Generate key</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Raw key reveal panel ──────────────────────────────────────────────────────

function RawKeyPanel({ rawKey, label, onDismiss }: { rawKey: string; label: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  function copy() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Save your API key now</p>
          <p className="text-xs text-amber-700 mt-0.5">
            This is the only time <strong>{label}</strong> will be shown. Copy it before dismissing.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded-lg px-3 py-2 text-slate-800 overflow-x-auto">
          {visible ? rawKey : '•'.repeat(rawKey.length)}
        </code>
        <button
          onClick={() => setVisible(v => !v)}
          className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
          title={visible ? 'Hide' : 'Reveal'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={copy}
          className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
          title="Copy"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <button
        onClick={onDismiss}
        className="mt-3 text-xs text-amber-700 underline hover:text-amber-900"
      >
        I've saved my key — dismiss
      </button>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newRawKey, setNewRawKey] = useState<{ rawKey: string; label: string } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null)

  const utils = trpc.useUtils()

  const subQuery = trpc.checkout.statusByEmail.useQuery(
    { email: submittedEmail },
    { enabled: !!submittedEmail }
  )

  const keysQuery = trpc.dashboard.listApiKeys.useQuery(
    { email: submittedEmail },
    { enabled: !!submittedEmail }
  )

  const revokeMutation = trpc.dashboard.revokeApiKey.useMutation({
    onSuccess: () => {
      setRevokeConfirm(null)
      utils.dashboard.listApiKeys.invalidate({ email: submittedEmail })
    },
  })

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmittedEmail(email.trim().toLowerCase())
    setNewRawKey(null)
  }

  function handleKeyCreated(rawKey: string, label: string) {
    setShowNewKeyModal(false)
    setNewRawKey({ rawKey, label })
    utils.dashboard.listApiKeys.invalidate({ email: submittedEmail })
  }

  const sub = subQuery.data
  const keys = keysQuery.data ?? []

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            My Account
          </h1>
          <p className="text-sm text-slate-500">
            Manage your subscription and API keys. Enter the email address you used at checkout.
          </p>
        </div>

        {/* Email lookup */}
        {!submittedEmail ? (
          <form onSubmit={handleEmailSubmit} className="max-w-sm">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Email address
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder:text-slate-400"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                View <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Email header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Showing data for</span>
                <span className="text-sm font-semibold text-slate-900">{submittedEmail}</span>
              </div>
              <button
                onClick={() => { setSubmittedEmail(''); setEmail(''); setNewRawKey(null) }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Switch email
              </button>
            </div>

            {/* Subscription card */}
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Subscription
              </h2>

              {subQuery.isLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : !sub ? (
                <div className="rounded-xl border border-slate-200 p-6 text-center">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    No active subscription found for this email.
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    View plans <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <PlanBadge tier={sub.planTier} />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/pricing"
                      className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                      Upgrade
                    </Link>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="flex items-start gap-2.5">
                      <BarChart2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Audits used</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {sub.auditsUsed} / {sub.auditsLimit === 9999 ? '∞' : sub.auditsLimit}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Activated</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(sub.activatedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Expires</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(sub.expiresAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Link
                      to="/audit"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                    >
                      Submit an audit <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* API keys section — only shown if subscription exists */}
            {sub && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    API Keys
                  </h2>
                  <button
                    onClick={() => setShowNewKeyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New key
                  </button>
                </div>

                {/* New key reveal */}
                {newRawKey && (
                  <RawKeyPanel
                    rawKey={newRawKey.rawKey}
                    label={newRawKey.label}
                    onDismiss={() => setNewRawKey(null)}
                  />
                )}

                {keysQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading keys…
                  </div>
                ) : keys.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                    <Key className="w-7 h-7 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-1">No API keys yet.</p>
                    <p className="text-xs text-slate-400">
                      Generate a key to access the citation.is REST API programmatically.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {keys.map(key => (
                      <div key={key.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{key.label}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {key.keyPrefix}••••••••
                            {key.lastUsedAt && (
                              <span className="ml-2 not-italic">
                                · last used {formatDate(key.lastUsedAt)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <span className="text-xs text-slate-400 hidden sm:block">
                            Created {formatDate(key.createdAt)}
                          </span>
                          {revokeConfirm === key.id ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-red-600">Revoke?</span>
                              <button
                                onClick={() => revokeMutation.mutate({ email: submittedEmail, keyId: key.id })}
                                disabled={revokeMutation.isPending}
                                className="text-xs text-red-600 font-semibold hover:text-red-800"
                              >
                                {revokeMutation.isPending ? '…' : 'Yes'}
                              </button>
                              <button
                                onClick={() => setRevokeConfirm(null)}
                                className="text-xs text-slate-400 hover:text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRevokeConfirm(key.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded"
                              title="Revoke key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-slate-400 mt-3">
                  Use your API key in the{' '}
                  <code className="font-mono bg-slate-100 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>{' '}
                  header. See the{' '}
                  <Link to="/developers" className="underline hover:text-slate-600">
                    API documentation
                  </Link>{' '}
                  for details.
                </p>
              </section>
            )}
          </>
        )}
      </div>

      {showNewKeyModal && (
        <NewKeyModal
          email={submittedEmail}
          onClose={() => setShowNewKeyModal(false)}
          onCreated={handleKeyCreated}
        />
      )}
    </div>
  )
}

