/**
 * memexBridge.ts — Fire-and-forget SM-1 claim-tier integration
 *
 * Wires citation.is verification events into the Memex claim-tier at
 * https://memex.gummi.lt. All calls are non-blocking: if Memex is
 * unreachable the verification flow is unaffected.
 *
 * Flow:
 *   1. storeClaim(claimText) → POST /v1/claim/frame → returns mol_id
 *   2. recordVerdict(mol_id, verdict, evidence_url) → POST /v1/claim/verify
 *
 * The mol_id from step 1 is passed to step 2 so the reward loop can
 * later query recall_claims(verified_only=true) for source-backed claims.
 */

const MEMEX_BASE = "https://memex.gummi.lt";
const NAMESPACE  = "citation-is";
const TIMEOUT_MS = 5_000;

type MemexVerdict = "VERIFIED" | "REFUTED" | "AMBIGUOUS" | "INSUFFICIENT";

function mapVerdict(v: string): MemexVerdict {
  switch (v) {
    case "supported":            return "VERIFIED";
    case "refuted":              return "REFUTED";
    case "ambiguous":            return "AMBIGUOUS";
    case "insufficient_evidence":return "INSUFFICIENT";
    default:                     return "AMBIGUOUS";
  }
}

/**
 * Store a claim as an SM-1 mol-frame in Memex.
 * Returns the first mol's ID, or null on failure.
 */
export async function storeClaim(
  claimText: string,
  shareId: string,
): Promise<string | null> {
  try {
    const body = {
      namespace: NAMESPACE,
      subject: shareId,
      schema_fields: ["claim_text"],
      mols: [
        {
          predicate: "claim_text",
          value: claimText.slice(0, 1000),
          value_type: "text",
        },
      ],
      source_node: "citation.is/verify",
      extracted_by: "citation-desk",
    };
    const res = await fetch(`${MEMEX_BASE}/v1/claim/frame`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      frame?: { mols?: Array<{ id?: string }> };
    };
    return data?.frame?.mols?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Record a verification verdict against a mol in Memex.
 * Fire-and-forget — does not throw.
 */
export async function recordVerdict(
  molId: string,
  verdict: string,
  evidenceUrl: string | null,
  confidenceScore: number,
): Promise<void> {
  try {
    const body = {
      mol_id: molId,
      verdict: mapVerdict(verdict),
      confidence: confidenceScore / 100,
      evidence: evidenceUrl ?? `citation.is/verify`,
      verified_by: "citation.is",
      notes: `Verified via citation.is public verification pipeline`,
    };
    await fetch(`${MEMEX_BASE}/v1/claim/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // intentionally silent — never block verification
  }
}
