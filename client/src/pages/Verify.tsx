import { useState } from "react";
import { useParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

// ─── Verdict helpers ────────────────────────────────────────────────────────
const VERDICT_CONFIG = {
  supported: {
    label: "Supported",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: "✓",
    dot: "bg-emerald-500",
  },
  refuted: {
    label: "Refuted",
    color: "bg-red-50 border-red-200 text-red-800",
    icon: "✗",
    dot: "bg-red-500",
  },
  ambiguous: {
    label: "Ambiguous",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "~",
    dot: "bg-amber-500",
  },
  insufficient_evidence: {
    label: "Insufficient Evidence",
    color: "bg-slate-50 border-slate-200 text-slate-700",
    icon: "?",
    dot: "bg-slate-400",
  },
  error: {
    label: "Error",
    color: "bg-slate-50 border-slate-200 text-slate-600",
    icon: "!",
    dot: "bg-slate-400",
  },
} as const;

type Verdict = keyof typeof VERDICT_CONFIG;

// ─── Shared result card ──────────────────────────────────────────────────────
function VerdictCard({
  claimText,
  verdict,
  confidenceScore,
  evidenceSummary,
  sourceUrls,
  shareId,
}: {
  claimText: string;
  verdict: Verdict;
  confidenceScore: number;
  evidenceSummary: string;
  sourceUrls: string[];
  shareId?: string;
}) {
  const cfg = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.ambiguous;
  const shareUrl = shareId ? `${window.location.origin}/verify/${shareId}` : null;

  const handleCopy = () => {
    if (shareUrl) void navigator.clipboard.writeText(shareUrl);
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${cfg.color}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${cfg.dot}`}>
            {cfg.icon}
          </div>
          <div>
            <div className="font-semibold text-lg">{cfg.label}</div>
            <div className="text-sm opacity-70">Confidence: {confidenceScore}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${cfg.dot}`}
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Claim */}
      <blockquote className="text-sm font-mono bg-white/60 rounded-lg px-4 py-3 mb-4 border border-current/20 italic">
        "{claimText}"
      </blockquote>

      {/* Evidence summary */}
      {evidenceSummary && (
        <p className="text-sm leading-relaxed mb-4">{evidenceSummary}</p>
      )}

      {/* Sources */}
      {sourceUrls.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Evidence Sources</div>
          <div className="flex flex-wrap gap-2">
            {sourceUrls.slice(0, 5).map((src, i) => (
              <a
                key={i}
                href={src.startsWith("http") ? src : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-white/70 rounded px-2 py-1 border border-current/20 hover:bg-white/90 transition-colors truncate max-w-xs"
              >
                {src.replace(/^https?:\/\//, "").slice(0, 60)}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Share */}
      {shareUrl && (
        <div className="flex items-center gap-2 pt-3 border-t border-current/20">
          <span className="text-xs opacity-60 font-mono truncate flex-1">{shareUrl}</span>
          <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs shrink-0">
            Copy link
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Shared result page (accessed via /verify/:shareId) ─────────────────────
function SharedVerifyResult({ shareId }: { shareId: string }) {
  const { data, isLoading, error } = trpc.verify.getVerification.useQuery({ shareId });

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner className="w-8 h-8 text-emerald-600" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-slate-600">Verification result not found.</div>
        <a href="/verify" className="text-emerald-600 underline mt-2 block">Verify a new claim</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6">
            ← citation.is
          </a>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Claim Verification Result</h1>
          <p className="text-slate-500 text-sm">Verified by the citation.is universal grounding layer</p>
        </div>
        <VerdictCard
          claimText={data.claimText}
          verdict={data.verdict as Verdict}
          confidenceScore={data.confidenceScore}
          evidenceSummary={data.evidenceSummary}
          sourceUrls={data.sourceUrls}
          shareId={data.shareId}
        />
        <div className="mt-6 text-center">
          <a href="/verify" className="text-emerald-600 hover:underline text-sm">
            Verify another claim →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main /verify page ───────────────────────────────────────────────────────
const EXAMPLE_CLAIMS = [
  "Berberine is as effective as metformin for lowering blood sugar in type 2 diabetes.",
  "Intermittent fasting extends lifespan in humans.",
  "NMN supplementation reverses aging in human clinical trials.",
  "The gut microbiome influences mental health through the gut-brain axis.",
  "CRISPR gene editing has been successfully used to treat sickle cell disease.",
];

export default function Verify() {
  const { shareId } = useParams<{ shareId?: string }>();

  if (shareId) return <SharedVerifyResult shareId={shareId} />;

  const [claimText, setClaimText] = useState("");
  const [result, setResult] = useState<{
    shareId: string;
    claimText: string;
    verdict: Verdict;
    confidenceScore: number;
    evidenceSummary: string;
    sourceUrls: string[];
  } | null>(null);

  const verify = trpc.verify.verifyClaim.useMutation({
    onSuccess: (data) => {
      setResult({
        ...data,
        verdict: data.verdict as Verdict,
      });
    },
  });

  const handleVerify = () => {
    if (!claimText.trim() || claimText.trim().length < 10) return;
    setResult(null);
    verify.mutate({ claimText: claimText.trim() });
  };

  const handleExample = (example: string) => {
    setClaimText(example);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Page header — sits below the global Nav */}
      <div className="border-b border-slate-50 bg-slate-50/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">citation.is / verify</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500">Grounding layer active</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Verify any claim
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Paste any factual claim. The citation.is grounding layer checks it against peer-reviewed evidence and returns a structured verdict.
          </p>
        </div>

        {/* Input */}
        <Card className="shadow-sm border-slate-200 mb-6">
          <CardContent className="p-6">
            <Textarea
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="Enter a factual claim to verify — e.g. 'Berberine lowers blood sugar as effectively as metformin'"
              className="min-h-[100px] text-base resize-none border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleVerify();
              }}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400">
                {claimText.length}/2000 · Free: 5/hour ·{" "}
                <a href="/pricing" className="text-emerald-600 hover:underline">Upgrade for unlimited</a>
              </span>
              <Button
                onClick={handleVerify}
                disabled={verify.isPending || claimText.trim().length < 10}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
              >
                {verify.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="w-4 h-4" />
                    Verifying…
                  </span>
                ) : (
                  "Verify claim →"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {verify.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm mb-6">
            {verify.error.message}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mb-10">
            <VerdictCard
              claimText={result.claimText}
              verdict={result.verdict}
              confidenceScore={result.confidenceScore}
              evidenceSummary={result.evidenceSummary}
              sourceUrls={result.sourceUrls}
              shareId={result.shareId}
            />
          </div>
        )}

        <Separator className="my-8" />

        {/* Example claims */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
            Try an example claim
          </div>
          <div className="flex flex-col gap-2">
            {EXAMPLE_CLAIMS.map((claim, i) => (
              <button
                key={i}
                onClick={() => handleExample(claim)}
                className="text-left text-sm text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg px-4 py-3 border border-slate-100 hover:border-emerald-200 transition-all"
              >
                "{claim}"
              </button>
            ))}
          </div>
        </div>

        {/* API CTA */}
        <div className="mt-12 rounded-xl bg-slate-900 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold mb-1">Integrate the verification API</div>
              <div className="text-slate-400 text-sm">
                Call <code className="text-emerald-400 font-mono">POST /api/public/verify-claim</code> from any AI system to ground its outputs in verified evidence. No API key required.
              </div>
            </div>
            <a href="/developers">
              <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/10 shrink-0">
                API Docs
              </Button>
            </a>
          </div>
          <pre className="mt-4 text-xs text-slate-300 font-mono bg-black/30 rounded-lg p-4 overflow-x-auto">
{`curl -X POST https://citation.is/api/public/verify-claim \\
  -H "Content-Type: application/json" \\
  -d '{"claim": "Berberine lowers blood sugar..."}'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
