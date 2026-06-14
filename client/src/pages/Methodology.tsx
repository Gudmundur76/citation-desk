/**
 * /methodology — Full pipeline and methodology disclosure.
 *
 * Addresses the critical review finding: "The appearance of rigor is more
 * dangerous than admitted uncertainty." This page discloses exactly how
 * verdicts are assigned, what the confidence score means, how conflicts
 * are resolved, and what the known error rates are.
 */
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  GitMerge,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Minus,
  AlertCircle,
} from 'lucide-react'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <h2
        className="text-2xl font-bold text-slate-900 mb-6"
        style={{ fontFamily: 'Syne, sans-serif' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── Callout box ─────────────────────────────────────────────────────────────

function Callout({
  type,
  children,
}: {
  type: 'info' | 'warning'
  children: React.ReactNode
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }
  const Icon = type === 'info' ? Info : AlertTriangle
  return (
    <div className={`flex gap-3 p-4 rounded-xl border text-sm leading-relaxed ${styles[type]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function Methodology() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {/* Back nav */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to home
      </Link>

      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Methodology &amp; Transparency
        </div>
        <h1
          className="text-4xl font-bold text-slate-900 mb-4 leading-tight"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          How citation.is works
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed">
          This page discloses exactly how claims are extracted, how verdicts are assigned, what
          the confidence score means, and where the pipeline can be wrong. Transparency is the
          only defence against authoritative-looking uncertainty.
        </p>
      </div>

      {/* Table of contents */}
      <nav className="bg-slate-50 rounded-xl p-5 mb-12 border border-slate-200">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contents</p>
        <ol className="space-y-1.5 text-sm text-slate-600">
          {[
            ['pipeline', 'The verification pipeline'],
            ['verdicts', 'Verdict definitions'],
            ['confidence', 'The confidence score'],
            ['conflicts', 'How conflicts are resolved'],
            ['llm-role', 'The role of the LLM'],
            ['error-rates', 'Known limitations and error rates'],
            ['updates', 'How claims are updated'],
            ['provenance', 'Provenance and auditability'],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="hover:text-slate-900 transition-colors">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1. Pipeline */}
      <Section id="pipeline" title="The verification pipeline">
        <p className="text-slate-600 leading-relaxed mb-6">
          Every claim in the registry passes through four deterministic stages before a verdict is
          assigned. The pipeline runs autonomously every 6 hours via a swarm of specialist agents.
        </p>
        <div className="space-y-4">
          {[
            {
              icon: FileText,
              step: '01',
              title: 'Claim extraction',
              desc: 'A structured LLM prompt extracts subject-predicate-object triples from the source document. Each triple is normalised to a canonical form and deduplicated against the existing corpus using semantic similarity (threshold 0.35).',
            },
            {
              icon: GitMerge,
              step: '02',
              title: 'Entity resolution',
              desc: 'Named entities in each claim are resolved against four authoritative databases: UniProt (proteins), PubChem (compounds), NCBI Taxonomy (organisms), and PubMed (publications). Unresolvable entities are flagged as "Insufficient Evidence" and queued for expert review.',
            },
            {
              icon: ShieldCheck,
              step: '03',
              title: 'Evidence evaluation',
              desc: 'The resolved claim is cross-referenced against the source document and any related documents already in the corpus. The LLM evaluates whether the source text directly supports, refutes, or is ambiguous about the claim. Contradicting papers are detected and linked.',
            },
            {
              icon: RefreshCw,
              step: '04',
              title: 'Verdict assignment and logging',
              desc: 'A verdict and confidence score are assigned. The full decision — including the LLM prompt, model ID, database query results, and timestamp — is written to the provenance chain. Claims are re-evaluated when new evidence is ingested.',
            },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="flex gap-4 p-5 border border-slate-200 rounded-xl bg-white">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-slate-300">{step}</span>
                <Icon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Verdicts */}
      <Section id="verdicts" title="Verdict definitions">
        <p className="text-slate-600 leading-relaxed mb-6">
          Seven verdict categories are used. Each has a precise definition to minimise ambiguity.
        </p>
        <div className="space-y-3">
          {[
            {
              icon: CheckCircle2,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50 border-emerald-200',
              label: 'Supported',
              def: 'The source document contains direct, explicit evidence that the claim is true. The relevant passage is cited in the provenance chain.',
            },
            {
              icon: XCircle,
              color: 'text-red-500',
              bg: 'bg-red-50 border-red-200',
              label: 'Refuted',
              def: 'The source document contains direct, explicit evidence that contradicts the claim. At least one contradicting passage is cited.',
            },
            {
              icon: HelpCircle,
              color: 'text-amber-500',
              bg: 'bg-amber-50 border-amber-200',
              label: 'Ambiguous',
              def: 'The source document contains evidence that is mixed, conditional, or context-dependent. The claim cannot be classified as simply Supported or Refuted.',
            },
            {
              icon: Minus,
              color: 'text-slate-400',
              bg: 'bg-slate-50 border-slate-200',
              label: 'Insufficient Evidence',
              def: 'The source document does not contain enough information to evaluate the claim. This includes claims that go beyond the scope of the cited paper.',
            },
            {
              icon: XCircle,
              color: 'text-orange-500',
              bg: 'bg-orange-50 border-orange-200',
              label: 'Contradicted',
              def: 'A separate, independent source directly contradicts this claim. The contradiction is logged in the knowledge graph and both claims are retained with their individual verdicts.',
            },
            {
              icon: AlertCircle,
              color: 'text-amber-600',
              bg: 'bg-amber-50 border-amber-200',
              label: 'Partially Supported',
              def: 'The source document supports part of the claim but not all of it. The supported and unsupported components are identified in the rationale.',
            },
            {
              icon: Minus,
              color: 'text-purple-500',
              bg: 'bg-purple-50 border-purple-200',
              label: 'Out of Scope',
              def: 'The claim falls outside the domain of verifiable scientific literature — for example, policy opinions, future predictions, or value judgements. No verdict is assigned.',
            },
            {
              icon: HelpCircle,
              color: 'text-blue-500',
              bg: 'bg-blue-50 border-blue-200',
              label: 'Needs Expert Review',
              def: 'The automated pipeline could not reach a confident verdict. The claim is flagged for human domain-expert review before a final verdict is issued.',
            },
          ].map(({ icon: Icon, color, bg, label, def }) => (
            <div key={label} className={`flex gap-4 p-4 border rounded-xl ${bg}`}>
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
              <div>
                <span className={`text-sm font-bold ${color}`}>{label}</span>
                <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{def}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 3. Confidence score */}
      <Section id="confidence" title="The confidence score">
        <p className="text-slate-600 leading-relaxed mb-4">
          Every claim carries a confidence score between 0.0 and 1.0. This is distinct from the
          verdict. A claim can be <strong>Supported</strong> at 0.62 or at 0.97 — the verdict
          is the same, but the certainty is not.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700 rounded-tl-lg">Range</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Label</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700 rounded-tr-lg">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['0.90 – 1.00', 'High', 'Multiple independent sources agree. Entity resolution succeeded. No contradicting papers found.'],
                ['0.70 – 0.89', 'Good', 'Single strong source. Entity resolution succeeded. Minor ambiguity in phrasing.'],
                ['0.50 – 0.69', 'Moderate', 'Source supports the claim but with caveats, or entity resolution was partial.'],
                ['0.00 – 0.49', 'Low', 'Weak or indirect evidence. Entity resolution failed or contradicting evidence exists.'],
              ].map(([range, label, meaning]) => (
                <tr key={range} className="bg-white">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{range}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{label}</td>
                  <td className="px-4 py-3 text-slate-500">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">
          When an AI system queries citation.is, it should use the confidence score alongside the
          verdict. A "Supported" claim at 0.55 should be treated as tentative, not authoritative.
          The API returns both fields on every claim.
        </Callout>
      </Section>

      {/* 4. Conflicts */}
      <Section id="conflicts" title="How conflicts are resolved">
        <p className="text-slate-600 leading-relaxed mb-4">
          When two source papers make contradictory claims about the same subject, the pipeline
          does not suppress either. Instead:
        </p>
        <ol className="space-y-3 text-sm text-slate-600 leading-relaxed mb-6">
          <li className="flex gap-3">
            <span className="font-mono font-bold text-slate-400 shrink-0">1.</span>
            Both claims are retained in the registry with their individual verdicts.
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-bold text-slate-400 shrink-0">2.</span>
            A contradiction edge is created in the knowledge graph linking the two claims.
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-bold text-slate-400 shrink-0">3.</span>
            The confidence score of both claims is reduced proportionally to the severity of the contradiction.
          </li>
          <li className="flex gap-3">
            <span className="font-mono font-bold text-slate-400 shrink-0">4.</span>
            Both claims are surfaced on the{' '}
            <Link to="/contradictions" className="text-blue-600 hover:underline">
              Contradictions page
            </Link>{' '}
            for human review.
          </li>
        </ol>
        <Callout type="warning">
          Human experts can submit manual overrides via the Audit interface. Overrides are logged
          in the provenance chain with the reviewer's rationale and are not reversible without a
          new audit submission.
        </Callout>
      </Section>

      {/* 5. LLM role */}
      <Section id="llm-role" title="The role of the LLM">
        <p className="text-slate-600 leading-relaxed mb-4">
          The LLM (currently Claude Sonnet 4) is used for two tasks only:
        </p>
        <div className="space-y-3 mb-6">
          <div className="p-4 border border-slate-200 rounded-xl bg-white">
            <p className="text-sm font-semibold text-slate-800 mb-1">Claim extraction</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              The LLM reads the source document and outputs structured JSON (subject, predicate,
              object, evidence passage). It does not assign verdicts at this stage.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl bg-white">
            <p className="text-sm font-semibold text-slate-800 mb-1">Evidence evaluation</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Given a claim and the relevant passage from the source document, the LLM classifies
              the relationship as Supported / Refuted / Ambiguous / Insufficient Evidence /
              Contradicted / Partially Supported / Out of Scope / Needs Expert Review. The
              database cross-reference results are provided as context.
            </p>
          </div>
        </div>
        <Callout type="warning">
          The LLM does not have access to the internet during evaluation. It cannot fetch new
          papers or query databases directly. All database lookups are performed by deterministic
          code before the LLM prompt is constructed. This prevents the LLM from hallucinating
          database results.
        </Callout>
      </Section>

      {/* 6. Error rates */}
      <Section id="error-rates" title="Known limitations and error rates">
        <p className="text-slate-600 leading-relaxed mb-6">
          We do not claim zero error rates. The following limitations are known and actively
          monitored.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700 rounded-tl-lg">Failure mode</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Estimated rate</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-700 rounded-tr-lg">Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['False positive "Supported"', '3–7%', 'Confidence score below 0.70 flags low-certainty verdicts. Contradiction detection reduces this further.'],
                ['Entity resolution failure', '8–12%', 'Unresolved entities receive "Insufficient Evidence" rather than a false verdict. Flagged in provenance.'],
                ['Claim extraction hallucination', '2–4%', 'Extracted claims are validated against the source passage. Claims without a matching passage are rejected.'],
                ['Outdated verdict', 'Grows over time', 'Claims are re-evaluated every 6 hours when new documents are ingested. Confidence scores decay if no new evidence confirms the verdict.'],
              ].map(([mode, rate, mitigation]) => (
                <tr key={mode} className="bg-white">
                  <td className="px-4 py-3 font-medium text-slate-700">{mode}</td>
                  <td className="px-4 py-3 font-mono text-xs text-amber-600">{rate}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs leading-relaxed">{mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout type="info">
          These estimates are based on internal spot-checks against manually reviewed claims.
          A formal inter-rater agreement study is planned for Q3 2026. Results will be published
          here when available.
        </Callout>
      </Section>

      {/* 7. Updates */}
      <Section id="updates" title="How claims are updated">
        <p className="text-slate-600 leading-relaxed mb-4">
          Claims are not static. When new evidence is ingested that is relevant to an existing
          claim, the pipeline re-evaluates the claim and may update the verdict and confidence
          score. The original verdict is preserved in the provenance chain — it is never
          overwritten.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Each claim has a stable persistent identifier (PID) that does not change when the
          verdict is updated. External systems that cache a claim by PID will always receive
          the latest verdict when they re-query, and can access the full version history via
          the provenance endpoint.
        </p>
      </Section>

      {/* 8. Provenance */}
      <Section id="provenance" title="Provenance and auditability">
        <p className="text-slate-600 leading-relaxed mb-4">
          Every claim in the registry has a full provenance chain accessible via the API. The
          chain records:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 leading-relaxed mb-6">
          {[
            'The source document (title, DOI/PMID, URL)',
            'The exact passage from the source that was evaluated',
            'The LLM model ID and prompt version used',
            'The database query results (UniProt, PubChem, NCBI, PubMed)',
            'The timestamp of each evaluation run',
            'Any manual overrides, with the reviewer\'s rationale',
          ].map(item => (
            <li key={item} className="flex gap-2">
              <span className="text-slate-300 shrink-0">—</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-500 leading-relaxed">
          Provenance data is available via the{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">
            /api/external/trpc/provenance.getChain
          </code>{' '}
          endpoint. See the{' '}
          <Link to="/developers" className="text-blue-600 hover:underline">
            Developers page
          </Link>{' '}
          for the full API reference.
        </p>
      </Section>

      {/* Footer note */}
      <div className="border-t border-slate-100 pt-8 text-sm text-slate-400 leading-relaxed">
        Last updated: June 2026. Questions or corrections:{' '}
        <a href="/contact" className="text-blue-500 hover:underline">
          citation.is/contact
        </a>
        .
      </div>
    </div>
  )
}
