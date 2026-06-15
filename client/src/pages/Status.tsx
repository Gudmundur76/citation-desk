/**
 * /status — Pipeline health page for citation.is
 *
 * Shows live stats from the ttruthdesk.claims backend:
 *   - Total claims / verified claims
 *   - Last ingest and quality-pass timestamps
 *   - SIA generation and upgrade rate
 *   - Scheduled job status indicators
 *   - Domain coverage widget (Sprint 14) — per-domain claim counts and verification rates
 */
import { trpc } from "@/lib/trpc";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold text-slate-800 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function JobRow({
  name,
  schedule,
  ok,
  lastRun,
}: {
  name: string;
  schedule: string;
  ok: boolean | null;
  lastRun?: string | null;
}) {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      <td className="py-3 pr-4 text-sm font-mono text-slate-700">{name}</td>
      <td className="py-3 pr-4 text-xs text-slate-400">{schedule}</td>
      <td className="py-3 pr-4">
        {ok === null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            Unknown
          </span>
        ) : ok ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Operational
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Degraded
          </span>
        )}
      </td>
      <td className="py-3 text-xs text-slate-400">
        {lastRun ? new Date(lastRun).toLocaleString() : "—"}
      </td>
    </tr>
  );
}

/** Colour-coded verification rate badge */
function VerificationBadge({ rate }: { rate: number }) {
  if (rate >= 70) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        {rate}%
      </span>
    );
  }
  if (rate >= 40) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        {rate}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
      {rate > 0 ? `${rate}%` : "—"}
    </span>
  );
}

export function Status() {
  const { data, isLoading } = trpc.status.pipeline.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  });

  const { data: domainsData, isLoading: domainsLoading } = trpc.status.domains.useQuery(
    undefined,
    {
      refetchInterval: 300_000, // refresh every 5 minutes
      staleTime: 240_000,
    }
  );

  const pipelineOk = data?.ok ?? null;
  const verifiedPct =
    data && data.totalClaims > 0
      ? Math.round((data.verifiedClaims / data.totalClaims) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Page header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1
            className="text-2xl font-bold text-slate-900"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            System Status
          </h1>
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
              Checking…
            </span>
          ) : pipelineOk ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              All systems operational
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Partial outage
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Live metrics from the{" "}
          <a
            href="https://ttruthdesk.claims"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            ttruthdesk.claims
          </a>{" "}
          verification backend. Refreshes every 60 seconds.
        </p>
      </div>

      {/* Stats grid */}
      <section aria-label="Pipeline statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Total claims"
          value={isLoading ? "—" : data?.totalClaims.toLocaleString() ?? "—"}
        />
        <StatCard
          label="Verified claims"
          value={isLoading ? "—" : data?.verifiedClaims.toLocaleString() ?? "—"}
          sub={isLoading ? undefined : `${verifiedPct}% of total`}
        />
        <StatCard
          label="Source documents"
          value={isLoading ? "—" : data?.totalDocuments.toLocaleString() ?? "—"}
        />
        <StatCard
          label="SIA generation"
          value={isLoading ? "—" : `Gen ${data?.siaGeneration ?? 1}`}
          sub={
            data?.siaUpgradeRate != null
              ? `${Math.round(data.siaUpgradeRate * 100)}% upgrade rate`
              : "Awaiting first run"
          }
        />
      </section>

      {/* Domain coverage widget (Sprint 14) */}
      <section aria-label="Domain coverage" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base font-semibold text-slate-700"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Domain Coverage
          </h2>
          {domainsData?.updatedAt && (
            <span className="text-xs text-slate-400">
              Updated {new Date(domainsData.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {domainsLoading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              <span className="animate-pulse">Loading domain coverage…</span>
            </div>
          ) : !domainsData?.domains || domainsData.domains.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Domain coverage data not yet available. The autonomous ingest loop will populate this as claims are verified.
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">
                      Claims
                    </th>
                    <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">
                      Supported
                    </th>
                    <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">
                      Verification Rate
                    </th>
                    <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">
                      Documents
                    </th>
                    <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      SLM Training
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {domainsData.domains.map((d) => (
                    <tr key={d.domain} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-slate-700">{d.label}</span>
                        <span className="ml-2 text-xs font-mono text-slate-400">{d.domain}</span>
                      </td>
                      <td className="py-3 px-4 text-sm tabular-nums text-slate-600 text-right">
                        {d.totalClaims.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm tabular-nums text-slate-600 text-right">
                        {d.supportedClaims.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <VerificationBadge rate={d.verificationRate} />
                      </td>
                      <td className="py-3 px-4 text-sm tabular-nums text-slate-500 text-right">
                        {d.totalDocuments.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        {d.slm ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  d.slm.slmReady
                                    ? 'bg-emerald-500'
                                    : d.slm.pctToThreshold >= 50
                                    ? 'bg-amber-400'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${d.slm.pctToThreshold}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums text-slate-500 whitespace-nowrap">
                              {d.slm.slmReady ? (
                                <span className="text-emerald-600 font-medium">Ready</span>
                              ) : (
                                `${d.slm.pairsEstimate}/${d.slm.threshold}`
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {domainsData.totals && (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td className="py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Total
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold tabular-nums text-slate-600 text-right">
                        {domainsData.totals.totalClaims.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold tabular-nums text-slate-600 text-right">
                        {domainsData.totals.supportedClaims.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <VerificationBadge
                          rate={
                            domainsData.totals.totalClaims > 0
                              ? Math.round(
                                  (domainsData.totals.supportedClaims /
                                    domainsData.totals.totalClaims) *
                                    100
                                )
                              : 0
                          }
                        />
                      </td>
                      <td className="py-2.5 px-4 text-xs font-semibold tabular-nums text-slate-500 text-right">
                        {domainsData.totals.totalDocuments.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-400">
                        {domainsData.domains.filter(d => d.slm?.slmReady).length} / {domainsData.domains.length} ready
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
              <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/50">
                <p className="text-xs text-slate-400">
                  Autonomous ingest runs every 6 hours across biology, medicine, chemistry, physics, and climate domains.
                  Claims are verified against PubMed, UniProt, and PDB in real time.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Scheduled jobs */}
      <section aria-label="Scheduled jobs" className="mb-10">
        <h2
          className="text-base font-semibold text-slate-700 mb-4"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Scheduled Jobs
        </h2>
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Job
                </th>
                <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-2.5 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Last run
                </th>
              </tr>
            </thead>
            <tbody className="px-4">
              <tr className="border-b border-slate-50">
                <td className="py-3 px-4 text-sm font-mono text-slate-700">pmc-feed-nightly</td>
                <td className="py-3 px-4 text-xs text-slate-400">Daily 01:00 UTC</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Operational
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-slate-400">
                  {data?.lastIngestAt ? new Date(data.lastIngestAt).toLocaleString() : "—"}
                </td>
              </tr>
              <JobRow
                name="quality-pass-nightly"
                schedule="Daily 02:00 UTC"
                ok={pipelineOk}
                lastRun={data?.lastQualityPassAt}
              />
              <JobRow
                name="meta-agent-daily"
                schedule="Daily 04:00 UTC"
                ok={pipelineOk}
              />
              <JobRow
                name="discovery-loop-daily"
                schedule="Daily 08:00 UTC"
                ok={pipelineOk}
              />
              <JobRow
                name="domain-ingest-6h"
                schedule="Every 6 hours"
                ok={pipelineOk}
              />
              <JobRow
                name="pubmed-decode-weekly"
                schedule="Monday 06:00 UTC"
                ok={pipelineOk}
              />
              <JobRow
                name="claim-digest-hourly"
                schedule="Every hour"
                ok={true}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Research verticals */}
      {data?.verticals && data.verticals.length > 0 && (
        <section aria-label="Active research verticals" className="mb-10">
          <h2
            className="text-base font-semibold text-slate-700 mb-4"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Active Research Verticals
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.verticals.map(v => (
              <span
                key={v}
                className="text-xs font-mono bg-slate-50 border border-slate-100 text-slate-600 rounded-full px-3 py-1"
              >
                {v.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* SIA self-improvement note */}
      <section
        aria-label="SIA self-improvement"
        className="bg-slate-50 border border-slate-100 rounded-xl p-5"
      >
        <h2
          className="text-sm font-semibold text-slate-700 mb-1"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Self-Improving Extraction (SIA)
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The claim extraction pipeline uses a{" "}
          <a
            href="https://github.com/hexo-ai/sia"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            SIA-style feedback loop
          </a>{" "}
          — after each nightly quality pass, the system evaluates its own upgrade rate and
          proposes improved extraction prompts for the next generation. Currently on{" "}
          <strong>Generation {data?.siaGeneration ?? 1}</strong>
          {data?.siaUpgradeRate != null && (
            <> with a <strong>{Math.round(data.siaUpgradeRate * 100)}%</strong> upgrade rate</>
          )}
          .
        </p>
      </section>
    </div>
  );
}
