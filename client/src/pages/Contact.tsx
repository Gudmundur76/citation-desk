// @ts-nocheck
import { useState } from 'react'
import { Nav } from '@/components/citation/Nav'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Mail, Building2, MessageSquare } from 'lucide-react'

const SUBJECTS = [
  'MCP Integration',
  'API Access',
  'Integration Inquiry',
  'Research Collaboration',
  'Press Inquiry',
  'Other',
]

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const contact = trpc.contact.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => setError(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Name, email, and message are required.')
      return
    }
    contact.mutate(form)
  }

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium mb-4">
            <Mail className="w-3 h-3" />
            Get in touch
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            Contact citation.is
          </h1>
          <p className="text-slate-500 text-base leading-relaxed">
            For MCP integration support, API access, integration inquiries, or research collaboration.
            All messages go directly to the founder.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              Message received
            </h2>
            <p className="text-slate-500 text-sm">
              Thank you, {form.name.split(' ')[0]}. We will be in touch shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Gudmundur Eyberg"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-slate-50 border-slate-200 focus:border-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Email <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-slate-50 border-slate-200 focus:border-slate-400"
                />
              </div>
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Organization
              </label>
              <Input
                placeholder="Your organisation…"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="bg-slate-50 border-slate-200 focus:border-slate-400"
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Subject
              </label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, subject: s })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.subject === s
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Message <span className="text-red-400">*</span>
              </label>
              <Textarea
                rows={5}
                placeholder="Tell us what you are building and how citation.is can help…"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="bg-slate-50 border-slate-200 focus:border-slate-400 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={contact.isPending}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 text-sm font-medium"
            >
              {contact.isPending ? 'Sending…' : 'Send message'}
            </Button>

            <p className="text-xs text-slate-400 text-center">
              Messages go directly to the founder. We respond within 24 hours.
            </p>
          </form>
        )}

        {/* Quick links */}
        <div className="mt-12 pt-8 border-t border-slate-100 grid sm:grid-cols-3 gap-4">
          {[
            { label: 'MCP Server', href: '/mcp', desc: 'Connect your agent' },
            { label: 'API Docs', href: '/developers', desc: 'REST + tRPC reference' },
            { label: 'Open Corpus', href: '/api/public/claims.json', desc: 'CC BY 4.0 download' },
          ].map(({ label, href, desc }) => (
            <a
              key={label}
              href={href}
              className="block rounded-xl border border-slate-200 p-4 hover:border-slate-400 transition-colors group"
            >
              <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-700 mb-0.5">
                {label}
              </div>
              <div className="text-xs text-slate-400">{desc}</div>
            </a>
          ))}
        </div>
      </main>
    </div>
  )
}
