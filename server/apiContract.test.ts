/**
 * apiContract.test.ts
 *
 * Validates that the ttruthdesk.claims public API response shape matches the
 * ClaimRecord / GlobalClaimsRegistry contract that citation-desk depends on.
 *
 * This test runs against the LIVE upstream API by default. Set
 * SKIP_CONTRACT_TESTS=true to skip in local dev when the backend is unavailable.
 *
 * Fail loudly on shape changes — a silent field rename in ttruthdesk-platform
 * would break llms-full.txt, OAI-PMH, and RSS without this guard.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL =
  process.env.TTRUTHDESK_BASE_URL ?? "https://ttruthdesk.claims";
const SKIP = process.env.SKIP_CONTRACT_TESTS === "true";

// ─── Type mirrors (must stay in sync with claimsRegistrySerializer.ts) ───────

type ClaimSourceRef = {
  database: string;
  entry_id: string;
  url: string;
  description?: string;
};

type ClaimRecord = {
  id: string;
  value: string;
  label: string;
  claim_type: string;
  extracted_value: string | null;
  verdict: string | null;
  verdict_rationale: string | null;
  manually_reviewed: boolean;
  evidence_checked_at: string | null;
  source_refs: ClaimSourceRef[];
  page_anchors: string[];
  date_observed: string;
};

type GlobalClaimsRegistry = {
  $schema: string;
  standard: string;
  generated_at: string;
  license: string;
  attribution: string;
  count: number;
  claims: ClaimRecord[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertRequiredString(obj: Record<string, unknown>, field: string, context: string) {
  expect(
    typeof obj[field],
    `${context}: field "${field}" must be a string (got ${typeof obj[field]})`
  ).toBe("string");
  expect(
    (obj[field] as string).length,
    `${context}: field "${field}" must be non-empty`
  ).toBeGreaterThan(0);
}

function assertNullableString(obj: Record<string, unknown>, field: string, context: string) {
  const val = obj[field];
  expect(
    val === null || typeof val === "string",
    `${context}: field "${field}" must be string | null (got ${typeof val})`
  ).toBe(true);
}

function validateClaimRecord(claim: Record<string, unknown>, index: number) {
  const ctx = `claims[${index}]`;

  // Required string fields
  for (const f of ["id", "value", "label", "claim_type", "date_observed"] as const) {
    assertRequiredString(claim, f, ctx);
  }

  // id must follow ptd-<docId>-<claimId> pattern
  expect(
    /^ptd-\d+-\d+$/.test(claim.id as string),
    `${ctx}: id "${claim.id}" must match ptd-<docId>-<claimId>`
  ).toBe(true);

  // Nullable string fields
  for (const f of ["extracted_value", "verdict", "verdict_rationale", "evidence_checked_at"] as const) {
    assertNullableString(claim, f, ctx);
  }

  // Boolean field
  expect(
    typeof claim.manually_reviewed,
    `${ctx}: manually_reviewed must be boolean`
  ).toBe("boolean");

  // Array fields
  expect(Array.isArray(claim.source_refs), `${ctx}: source_refs must be an array`).toBe(true);
  expect(Array.isArray(claim.page_anchors), `${ctx}: page_anchors must be an array`).toBe(true);

  // Validate source_refs entries
  for (const [i, ref] of (claim.source_refs as Record<string, unknown>[]).entries()) {
    const rctx = `${ctx}.source_refs[${i}]`;
    assertRequiredString(ref, "database", rctx);
    assertRequiredString(ref, "entry_id", rctx);
    assertRequiredString(ref, "url", rctx);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ttruthdesk.claims API contract", () => {
  let registry: GlobalClaimsRegistry;

  beforeAll(async () => {
    if (SKIP) return;
    const res = await fetch(`${BASE_URL}/api/public/claims.json`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.ok, `GET /api/public/claims.json returned ${res.status}`).toBe(true);
    registry = (await res.json()) as GlobalClaimsRegistry;
  });

  it("skips when SKIP_CONTRACT_TESTS=true", () => {
    if (SKIP) {
      console.log("Contract tests skipped (SKIP_CONTRACT_TESTS=true)");
      return;
    }
  });

  it("GlobalClaimsRegistry has required top-level fields", () => {
    if (SKIP) return;
    const required = ["$schema", "standard", "generated_at", "license", "attribution"] as const;
    for (const f of required) {
      assertRequiredString(registry as unknown as Record<string, unknown>, f, "registry");
    }
    expect(typeof registry.count, "count must be a number").toBe("number");
    expect(registry.count, "count must be >= 0").toBeGreaterThanOrEqual(0);
    expect(Array.isArray(registry.claims), "claims must be an array").toBe(true);
  });

  it("claims array length matches count field", () => {
    if (SKIP) return;
    expect(registry.claims.length, "claims.length must equal count").toBe(registry.count);
  });

  it("registry contains at least one claim", () => {
    if (SKIP) return;
    expect(registry.claims.length, "registry must have at least 1 claim").toBeGreaterThan(0);
  });

  it("license references CC BY 4.0", () => {
    if (SKIP) return;
    // The API returns the full URL: https://creativecommons.org/licenses/by/4.0/
    expect(
      registry.license.includes("CC BY 4.0") ||
        registry.license.includes("creativecommons.org/licenses/by/4.0"),
      `license "${registry.license}" must reference CC BY 4.0`
    ).toBe(true);
  });

  it("all ClaimRecord fields are present and correctly typed (first 10 claims)", () => {
    if (SKIP) return;
    const sample = registry.claims.slice(0, 10);
    for (const [i, claim] of sample.entries()) {
      validateClaimRecord(claim as unknown as Record<string, unknown>, i);
    }
  });

  it("verdict values are from the allowed enum", () => {
    if (SKIP) return;
    const allowedVerdicts = new Set([
      "Supported",
      "Contradicted",
      "Partially Supported",
      "Ambiguous",
      "Insufficient Evidence",
      "Out of Scope",
      "Needs Expert Review",
      null,
    ]);
    for (const [i, claim] of registry.claims.slice(0, 50).entries()) {
      const c = claim as unknown as ClaimRecord;
      expect(
        allowedVerdicts.has(c.verdict),
        `claims[${i}]: verdict "${c.verdict}" is not in the allowed enum`
      ).toBe(true);
    }
  });

  it("date_observed is a valid ISO 8601 date-time string", () => {
    if (SKIP) return;
    for (const [i, claim] of registry.claims.slice(0, 10).entries()) {
      const c = claim as unknown as ClaimRecord;
      const d = new Date(c.date_observed);
      expect(
        isNaN(d.getTime()),
        `claims[${i}]: date_observed "${c.date_observed}" is not a valid date`
      ).toBe(false);
    }
  });
});
