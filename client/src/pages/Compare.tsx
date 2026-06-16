// @ts-nocheck
/**
 * /compare — The Perplexity Accuracy Comparison Tool
 *
 * This is the highest-value buyer-facing page on citation.is.
 * It demonstrates, live and publicly, that AI systems hallucinate factual claims
 * that citation.is would have caught — and shows the exact citation evidence.
 *
 * Strategic purpose:
 *   - Gets cited by Perplexity, Anthropic, OpenAI researchers when they search
 *     for "AI hallucination grounding" or "LLM fact verification"
 *   - Demonstrates the acquisition thesis in one page: "this is what you're missing"
 *   - Generates shareable results that spread virally in research/AI circles
 *
 * Architecture:
 *   - User enters a query (not a claim — a natural language question)
 *   - Server calls Perplexity Sonar to get a real AI answer with citations
 *   - Server extracts factual claims from the answer
 *   - Server runs each claim through the citation.is verdict engine
 *   - UI shows side-by-side: Perplexity answer | citation.is verdict per claim
 *   - Shareable URL for each comparison result
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

// ─── Verdict helpers ─────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  supported: { label: "Supported", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", icon: "✓" },
  refuted: { label: "Refuted", bg: "bg-red-100", text: "text-red-800", border: "border-red-300", icon: "✗" },
  ambiguous: { label: "Ambiguous", bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", icon: "~" },
  insufficient_evidence: { label: "Insufficient Evidence", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", icon: "?" },
  error: { label: "Unverified", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", icon: "–" },
} as const;
type Verdict = keyof typeof VERDICT_CONFIG;

// ─── Claim verdict row ────────────────────────────────────────────────────────
function ClaimRow({ claim, verdict, confidence, summary }: {
  claim: string;
  verdict: Verdict;
  confidence: number;
  summary: string;
}) {
  const cfg = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.ambiguous;
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3">
        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${verdict === "supported" ? "bg-emerald-500" : verdict === "refuted" ? "bg-red-500" : verdict === "ambiguous" ? "bg-amber-500" : "bg-slate-400"}`}>
          {cfg.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
            <span className="text-xs text-slate-400">{confidence}% confidence</span>
          </div>
          <p className={`text-sm font-medium ${cfg.text} mb-1`}>"{claim}"</p>
          {summary && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-xs underline ${cfg.text} opacity-70 hover:opacity-100`}
            >
              {expanded ? "Hide evidence" : "Show evidence"}
            </button>
          )}
          {expanded && summary && (
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{summary}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Accuracy score badge ─────────────────────────────────────────────────────
function AccuracyScore({ claims }: { claims: Array<{ verdict: string }> }) {
  if (claims.length === 0) return null;
  const supported = claims.filter(c => c.verdict === "supported").length;
  const refuted = claims.filter(c => c.verdict === "refuted").length;
  const total = claims.length;
  const pct = Math.round((supported / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-slate-700 font-mono shrink-0">
        {pct}% supported
      </span>
      {refuted > 0 && (
        <span className="text-xs text-red-600 font-medium shrink-0">
          {refuted} refuted
        </span>
      )}
    </div>
  );
}

// ─── Shared comparison result (accessed via /compare/:shareId) ───────────────
function SharedCompareResult({ shareId }: { shareId: string }) {
  const { data, isLoading, error } = trpc.compare.getComparison.useQuery({ shareId });

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner className="w-8 h-8 text-emerald-600" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-slate-600">Comparison result not found.</div>
        <a href="/compare" className="text-emerald-600 underline mt-2 block">Run a new comparison</a>
      </div>
    </div>
  );

  const claims = JSON.parse(data.claimsJson ?? "[]") as Array<{
    claim: string; verdict: string; confidence: number; summary: string;
  }>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <a href="/" className="text-slate-400 hover:text-slate-600 text-sm block mb-4">← citation.is</a>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">AI Accuracy Report</h1>
          <p className="text-slate-500 text-sm">Generated by citation.is universal grounding layer</p>
        </div>
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Query</div>
            <p className="text-slate-800 font-medium mb-4">"{data.query}"</p>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">AI Answer (Perplexity Sonar)</div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.aiAnswer}</p>
          </CardContent>
        </Card>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-slate-700">{claims.length} factual claims extracted</div>
          </div>
          <AccuracyScore claims={claims} />
        </div>
        <div className="flex flex-col gap-3 mt-4">
          {claims.map((c, i) => (
            <ClaimRow
              key={i}
              claim={c.claim}
              verdict={c.verdict as Verdict}
              confidence={c.confidence}
              summary={c.summary}
            />
          ))}
        </div>
        <div className="mt-8 text-center">
          <a href="/compare" className="text-emerald-600 hover:underline text-sm">
            Run another comparison →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Example queries ──────────────────────────────────────────────────────────
const EXAMPLE_QUERIES = [
  "What does the evidence say about berberine for blood sugar control?",
  "Is intermittent fasting effective for weight loss and longevity?",
  "What are the proven benefits of NMN supplementation in humans?",
  "How effective is CRISPR for treating genetic diseases?",
  "What does science say about the gut-brain axis and mental health?",
];

// ─── Main /compare page ───────────────────────────────────────────────────────
export default function Compare() {
  const { shareId } = useParams<{ shareId?: string }>();
  if (shareId) return <SharedCompareResult shareId={shareId} />;

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    shareId: string;
    query: string;
    aiAnswer: string;
    claimsJson: string;
    aiSource: string;
  } | null>(null);

  const compare = trpc.compare.runComparison.useMutation({
    onSuccess: (data) => setResult(data),
  });

  const handleRun = () => {
    if (!query.trim() || query.trim().length < 10) return;
    setResult(null);
    compare.mutate({ query: query.trim() });
  };

  const claims = result ? (JSON.parse(result.claimsJson ?? "[]") as Array<{
    claim: string; verdict: string; confidence: number; summary: string;
  }>) : [];

  const shareUrl = result ? `${window.location.origin}/compare/${result.shareId}` : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Sub-header */}
      <div className="border-b border-slate-50 bg-slate-50/60">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">citation.is / compare</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">Live accuracy scoring</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Live AI accuracy benchmark
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            How accurate is AI on your question?
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Ask any factual question. citation.is runs it through Perplexity Sonar, extracts every factual claim from the answer, and verifies each one against peer-reviewed evidence. You see exactly where AI gets it right — and where it doesn't.
          </p>
        </div>

        {/* Input */}
        <Card className="shadow-sm border-slate-200 mb-6">
          <CardContent className="p-6">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask any factual question — e.g. 'What does the evidence say about berberine for blood sugar?'"
              className="min-h-[90px] text-base resize-none border-slate-200 focus:border-emerald-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun();
              }}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400">
                Powered by Perplexity Sonar + citation.is grounding ·{" "}
                <a href="/pricing" className="text-emerald-600 hover:underline">Unlimited via API</a>
              </span>
              <Button
                onClick={handleRun}
                disabled={compare.isPending || query.trim().length < 10}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
              >
                {compare.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="w-4 h-4" />
                    Analyzing…
                  </span>
                ) : (
                  "Run comparison →"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {compare.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-6">
            {compare.error.message}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mb-10">
            {/* AI answer panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">P</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Perplexity Sonar Answer</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{result.aiAnswer}</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">C</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">citation.is Accuracy Score</span>
                  </div>
                  <div className="mb-4">
                    <AccuracyScore claims={claims} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Claims", value: claims.length },
                      { label: "Supported", value: claims.filter(c => c.verdict === "supported").length },
                      { label: "Refuted", value: claims.filter(c => c.verdict === "refuted").length },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-lg p-2">
                        <div className="text-lg font-bold text-slate-800 font-mono">{s.value}</div>
                        <div className="text-xs text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Claim-by-claim breakdown */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-700 mb-3">
                Claim-by-claim verdict
              </div>
              <div className="flex flex-col gap-3">
                {claims.map((c, i) => (
                  <ClaimRow
                    key={i}
                    claim={c.claim}
                    verdict={c.verdict as Verdict}
                    confidence={c.confidence}
                    summary={c.summary}
                  />
                ))}
              </div>
            </div>

            {/* Share */}
            {shareUrl && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <span className="text-xs text-slate-500 font-mono truncate flex-1">{shareUrl}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void navigator.clipboard.writeText(shareUrl)}
                  className="shrink-0 text-xs"
                >
                  Copy shareable link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Example queries */}
        {!result && (
          <div className="mt-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
              Try an example query
            </div>
            <div className="flex flex-col gap-2">
              {EXAMPLE_QUERIES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(q)}
                  className="text-left text-sm text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg px-4 py-3 border border-slate-100 hover:border-emerald-200 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Acquisition pitch section */}
        <div className="mt-12 rounded-xl bg-slate-900 text-white p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                The grounding layer problem
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Every AI system that answers factual questions needs a ground truth layer. citation.is is that layer — continuously ingesting from OpenAlex, PubMed, CourtListener, SEC EDGAR, and 6 other authoritative corpora, extracting and verifying claims at scale.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Integrate via API
              </div>
              <pre className="text-xs text-slate-300 font-mono bg-black/30 rounded-lg p-3 overflow-x-auto">
{`POST /v1/compare
{
  "query": "...",
  "ai_answer": "...",
  "extract_claims": true
}
// Returns claim-level verdicts
// with evidence provenance`}
              </pre>
              <a href="/pricing" className="inline-block mt-3 text-xs text-emerald-400 hover:text-emerald-300 underline">
                Get API access →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
