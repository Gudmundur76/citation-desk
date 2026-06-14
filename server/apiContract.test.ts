/**
 * apiContract.test.ts
 *
 * Validates that the ttruthdesk.claims public API response shape matches the
 * contract that citation-desk depends on.
 *
 * This test runs against the LIVE upstream API by default. Set
 * SKIP_CONTRACT_TESTS=true to skip in local dev when the backend is unavailable.
 *
 * Fail loudly on shape changes — a silent field rename in ttruthdesk-platform
 * would break llms-full.txt, OAI-PMH, and RSS without this guard.
 *
 * ── Actual API shape (paginated) ─────────────────────────────────────────────
 * GET /api/public/claims?page_size=5
 * {
 *   "$schema": "https://ttruthdesk.claims/api/public/schemas/claims.schema.json",
 *   "generated_at": "2026-...",
 *   "page": 1,
 *   "page_size": 5,
 *   "total": 4005,
 *   "total_pages": 801,
 *   "filters": {},
 *   "claims": [
 *     {
 *       "id": "ptd-270001-300002",
 *       "claim_id": 300002,
 *       "document_id": 270001,
 *       "document_title": "...",
 *       "vertical_domain": "structural_biology",
 *       "claim_text": "...",
 *       "claim_type": "...",
 *       "extracted_value": null | string,
 *       "pdb_id": null | string,
 *       "verdict": "Supported" | "Insufficient Evidence" | ...,
 *       "verdict_rationale": null | string,
 *       "confidence_score": null | number,
 *       "verdict_method": null | string,
 *       "evidence_url": null | string,
 *       "page_url": "https://...",
 *       "audit_url": "https://...",
 *       "created_at": "2026-...",
 *       "updated_at": "2026-..."
 *     }
 *   ]
 * }
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL =
  process.env.TTRUTHDESK_BASE_URL ?? "https://ttruthdesk.claims";
const SKIP = process.env.SKIP_CONTRACT_TESTS === "true";

// ─── Type mirrors (must stay in sync with claimsRoutes.ts serialiser) ─────────

type ClaimRecord = {
  id: string;
  claim_id: number;
  document_id: number;
  document_title: string;
  vertical_domain: string;
  claim_text: string;
  claim_type: string;
  extracted_value: string | null;
  pdb_id: string | null;
  verdict: string | null;
  verdict_rationale: string | null;
  confidence_score: number | null;
  verdict_method: string | null;
  evidence_url: string | null;
  page_url: string;
  audit_url: string;
  created_at: string;
  updated_at: string;
};

type PaginatedClaimsResponse = {
  $schema: string;
  generated_at: string;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  filters: Record<string, unknown>;
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

function assertNullableNumber(obj: Record<string, unknown>, field: string, context: string) {
  const val = obj[field];
  expect(
    val === null || typeof val === "number",
    `${context}: field "${field}" must be number | null (got ${typeof val})`
  ).toBe(true);
}

function validateClaimRecord(claim: Record<string, unknown>, index: number) {
  const ctx = `claims[${index}]`;

  // id must follow ptd-<docId>-<claimId> pattern
  assertRequiredString(claim, "id", ctx);
  expect(
    /^ptd-\d+-\d+$/.test(claim.id as string),
    `${ctx}: id "${claim.id}" must match ptd-<docId>-<claimId>`
  ).toBe(true);

  // Required numeric fields
  expect(typeof claim.claim_id, `${ctx}: claim_id must be a number`).toBe("number");
  expect(typeof claim.document_id, `${ctx}: document_id must be a number`).toBe("number");

  // Required string fields
  for (const f of ["document_title", "vertical_domain", "claim_text", "claim_type", "page_url", "audit_url", "created_at"] as const) {
    assertRequiredString(claim, f, ctx);
  }

  // Nullable string fields
  for (const f of ["extracted_value", "pdb_id", "verdict", "verdict_rationale", "verdict_method", "evidence_url"] as const) {
    assertNullableString(claim, f, ctx);
  }

  // Nullable number fields
  assertNullableNumber(claim, "confidence_score", ctx);

  // page_url and audit_url must be valid https URLs
  expect(
    (claim.page_url as string).startsWith("https://"),
    `${ctx}: page_url must start with https://`
  ).toBe(true);
  expect(
    (claim.audit_url as string).startsWith("https://"),
    `${ctx}: audit_url must start with https://`
  ).toBe(true);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ttruthdesk.claims API contract", () => {
  let response: PaginatedClaimsResponse;

  beforeAll(async () => {
    if (SKIP) return;
    const res = await fetch(`${BASE_URL}/api/public/claims?page_size=10`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
    expect(res.ok, `GET /api/public/claims returned ${res.status}`).toBe(true);
    response = (await res.json()) as PaginatedClaimsResponse;
  });

  it("skips when SKIP_CONTRACT_TESTS=true", () => {
    if (SKIP) {
      console.log("Contract tests skipped (SKIP_CONTRACT_TESTS=true)");
      return;
    }
  });

  it("paginated response has required top-level fields", () => {
    if (SKIP) return;
    assertRequiredString(response as unknown as Record<string, unknown>, "$schema", "response");
    assertRequiredString(response as unknown as Record<string, unknown>, "generated_at", "response");
    expect(typeof response.page, "page must be a number").toBe("number");
    expect(typeof response.page_size, "page_size must be a number").toBe("number");
    expect(typeof response.total, "total must be a number").toBe("number");
    expect(typeof response.total_pages, "total_pages must be a number").toBe("number");
    expect(response.total, "total must be >= 0").toBeGreaterThanOrEqual(0);
    expect(Array.isArray(response.claims), "claims must be an array").toBe(true);
  });

  it("registry contains at least one claim", () => {
    if (SKIP) return;
    expect(response.claims.length, "registry must have at least 1 claim").toBeGreaterThan(0);
  });

  it("$schema references the canonical schema URL", () => {
    if (SKIP) return;
    expect(
      response.$schema.includes("ttruthdesk.claims") || response.$schema.includes("claims.schema.json"),
      `$schema "${response.$schema}" must reference the canonical schema`
    ).toBe(true);
  });

  it("all ClaimRecord fields are present and correctly typed (first 10 claims)", () => {
    if (SKIP) return;
    const sample = response.claims.slice(0, 10);
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
    for (const [i, claim] of response.claims.slice(0, 10).entries()) {
      const c = claim as unknown as ClaimRecord;
      expect(
        allowedVerdicts.has(c.verdict),
        `claims[${i}]: verdict "${c.verdict}" is not in the allowed enum`
      ).toBe(true);
    }
  });

  it("created_at is a valid ISO 8601 date-time string", () => {
    if (SKIP) return;
    for (const [i, claim] of response.claims.slice(0, 10).entries()) {
      const c = claim as unknown as ClaimRecord;
      const d = new Date(c.created_at);
      expect(
        isNaN(d.getTime()),
        `claims[${i}]: created_at "${c.created_at}" is not a valid date`
      ).toBe(false);
    }
  });

  it("GET /api/public/stats returns live JSON with totalClaims", async () => {
    if (SKIP) return;
    const res = await fetch(`${BASE_URL}/api/public/stats`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    expect(res.ok, `GET /api/public/stats returned ${res.status}`).toBe(true);
    const stats = await res.json() as Record<string, unknown>;
    expect(typeof stats.totalClaims, "totalClaims must be a number").toBe("number");
    expect((stats.totalClaims as number), "totalClaims must be >= 0").toBeGreaterThanOrEqual(0);
  });
});
