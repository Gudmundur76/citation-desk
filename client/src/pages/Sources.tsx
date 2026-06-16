// @ts-nocheck
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

const SOURCE_TYPE_CONFIG = {
  academic: { label: "Academic", color: "bg-blue-100 text-blue-700 border-blue-200" },
  legal: { label: "Legal", color: "bg-purple-100 text-purple-700 border-purple-200" },
  financial: { label: "Financial", color: "bg-amber-100 text-amber-700 border-amber-200" },
  news: { label: "News", color: "bg-rose-100 text-rose-700 border-rose-200" },
  web: { label: "Web", color: "bg-teal-100 text-teal-700 border-teal-200" },
  regulatory: { label: "Regulatory", color: "bg-slate-100 text-slate-700 border-slate-200" },
} as const;

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(date: Date | null): string {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Sources() {
  const { data: sources, isLoading } = trpc.verify.getSources.useQuery();

  const totalDocs = sources?.reduce((s, r) => s + r.documentsIngested, 0) ?? 0;
  const totalClaims = sources?.reduce((s, r) => s + r.claimsExtracted, 0) ?? 0;
  const activeSources = sources?.filter(s => s.isActive).length ?? 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <span className="font-bold text-slate-900 font-mono">citation.is</span>
            <span className="text-xs text-slate-400 hidden sm:block">/ sources</span>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">Ingestion active</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            Ingestion Sources
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            The citation.is grounding layer continuously ingests from every major open authoritative corpus — academic, legal, financial, regulatory, and web — building the most comprehensive verified truth layer ever assembled.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Active Sources", value: activeSources.toString() },
            { label: "Documents Ingested", value: formatNumber(totalDocs) },
            { label: "Claims Extracted", value: formatNumber(totalClaims) },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
              <div className="text-2xl font-bold text-slate-900 font-mono">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Sources grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner className="w-8 h-8 text-emerald-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(sources ?? []).map(source => {
              const typeConfig = SOURCE_TYPE_CONFIG[source.sourceType as keyof typeof SOURCE_TYPE_CONFIG] ?? SOURCE_TYPE_CONFIG.academic;
              return (
                <div
                  key={source.name}
                  className={`rounded-xl border p-5 transition-all ${source.isActive ? "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm" : "border-slate-100 bg-slate-50 opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm truncate">{source.label}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{source.name}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${source.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Docs", value: formatNumber(source.documentsIngested) },
                      { label: "Claims", value: formatNumber(source.claimsExtracted) },
                      { label: "Queries", value: formatNumber(source.queriesRun) },
                    ].map(stat => (
                      <div key={stat.label} className="text-center">
                        <div className="text-base font-bold text-slate-800 font-mono">{stat.value}</div>
                        <div className="text-xs text-slate-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Last run: {timeAgo(source.lastRunAt)}
                    </span>
                    {source.lastError && (
                      <span className="text-xs text-red-500 truncate max-w-[120px]" title={source.lastError}>
                        ⚠ {source.lastError.slice(0, 30)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-slate-900 text-white p-6 flex items-center justify-between gap-6">
          <div>
            <div className="font-semibold mb-1">Access the full graph via API</div>
            <div className="text-slate-400 text-sm">
              Query verified claims across all sources with a single API call.
            </div>
          </div>
          <a href="/pricing" className="shrink-0">
            <button className="px-4 py-2 rounded-lg border border-white/30 text-white text-sm hover:bg-white/10 transition-colors">
              Get API access →
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
