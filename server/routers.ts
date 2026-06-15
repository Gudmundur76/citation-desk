import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createPayPalOrder, capturePayPalOrder } from "./paypal";
import {
  createPendingSubscription,
  activateSubscription,
  getSubscriptionByOrderId,
  getActiveSubscriptionForEmail,
  PLAN_PRICES_USD,
  PLAN_LIMITS,
  type PlanTier,
} from "./subscriptionDb";
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from "./apiKeyService";

const PLAN_TIER_SCHEMA = z.enum(["starter", "diligence", "platform"]);

type VerifyPageVerdict =
  | "supported"
  | "refuted"
  | "ambiguous"
  | "insufficient_evidence"
  | "error";

type StoredVerification = {
  shareId: string;
  claimText: string;
  verdict: VerifyPageVerdict;
  confidenceScore: number;
  evidenceSummary: string;
  sourceUrls: string[];
};

const verificationStore = new Map<string, StoredVerification>();

function mapUpstreamVerdict(verdict: string): VerifyPageVerdict {
  switch (verdict) {
    case "Supported":
      return "supported";
    case "Contradicted":
      return "refuted";
    case "Partially Supported":
    case "Ambiguous":
    case "Needs Expert Review":
      return "ambiguous";
    case "Insufficient Evidence":
    case "Out of Scope":
      return "insufficient_evidence";
    default:
      return "error";
  }
}

function confidenceForVerdict(verdict: VerifyPageVerdict, signalDensity?: unknown): number {
  if (typeof signalDensity === "number" && Number.isFinite(signalDensity)) {
    return Math.max(1, Math.min(99, Math.round(signalDensity * 100)));
  }

  switch (verdict) {
    case "supported":
      return 88;
    case "refuted":
      return 84;
    case "ambiguous":
      return 56;
    case "insufficient_evidence":
      return 34;
    default:
      return 20;
  }
}

function uniqueUrls(values: Array<unknown>): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  /**
   * Checkout procedures — PayPal Orders API v2
   */
  checkout: router({
    /**
     * Create a PayPal order for a given plan tier.
     * Returns the PayPal order ID and the approval URL to redirect the user to.
     */
    createOrder: publicProcedure
      .input(
        z.object({
          planTier: PLAN_TIER_SCHEMA,
          email: z.string().email("Please enter a valid email address"),
          returnUrl: z.string().url(),
          cancelUrl: z.string().url(),
        })
      )
      .mutation(async ({ input }) => {
        const { planTier, email, returnUrl, cancelUrl } = input;

        if (planTier === "platform") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Platform tier requires a custom quote. Please contact us.",
          });
        }

        const amountUsd = PLAN_PRICES_USD[planTier as PlanTier];
        const planLabel = planTier === "starter" ? "Starter Audit" : "Diligence Audit";

        const { orderId, approvalUrl } = await createPayPalOrder({
          planTier: planTier as PlanTier,
          amountUsd,
          returnUrl,
          cancelUrl,
          description: `citation.is ${planLabel} — ${PLAN_LIMITS[planTier as PlanTier]} audits/year`,
        });

        // Record the pending subscription in our DB
        await createPendingSubscription({ email, paypalOrderId: orderId, planTier: planTier as PlanTier });

        return { orderId, approvalUrl, amountUsd };
      }),

    /**
     * Capture an approved PayPal order.
     * Called after the user returns from PayPal with ?token=ORDER_ID&PayerID=...
     * Activates the subscription and returns the subscription record.
     */
    captureOrder: publicProcedure
      .input(
        z.object({
          orderId: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const { orderId } = input;

        // Check we have a pending record for this order
        const existing = await getSubscriptionByOrderId(orderId);
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found. Please start checkout again.",
          });
        }
        if (existing.status === "active") {
          // Idempotent: already captured
          return {
            success: true,
            planTier: existing.planTier,
            email: existing.email,
            auditsLimit: existing.auditsLimit,
            expiresAt: existing.expiresAt?.toISOString() ?? null,
          };
        }

        const { captureId, status } = await capturePayPalOrder(orderId);

        if (status !== "COMPLETED") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `PayPal capture returned status: ${status}`,
          });
        }

        const subscription = await activateSubscription({
          paypalOrderId: orderId,
          paypalCaptureId: captureId,
        });

        if (!subscription) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Subscription activation failed. Please contact support.",
          });
        }

        return {
          success: true,
          planTier: subscription.planTier,
          email: subscription.email,
          auditsLimit: subscription.auditsLimit,
          expiresAt: subscription.expiresAt?.toISOString() ?? null,
        };
      }),

    /**
     * Look up subscription status for an email address.
     * Returns null if no active subscription found.
     */
    statusByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const sub = await getActiveSubscriptionForEmail(input.email);
        if (!sub) return null;
        return {
          planTier: sub.planTier,
          status: sub.status,
          auditsLimit: sub.auditsLimit,
          auditsUsed: sub.auditsUsed,
          activatedAt: sub.activatedAt?.toISOString() ?? null,
          expiresAt: sub.expiresAt?.toISOString() ?? null,
        };
      }),
  }),

  /**
   * Customer dashboard procedures — API key management
   * All procedures are keyed by email (no OAuth required for citation.is).
   */
  dashboard: router({
    /** List all active (non-revoked) API keys for an email. */
    listApiKeys: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const keys = await listApiKeys(input.email);
        return keys.map(k => ({
          id: k.id,
          label: k.label,
          keyPrefix: k.keyPrefix,
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          expiresAt: k.expiresAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
        }));
      }),

    /** Generate a new API key. Requires an active subscription. */
    generateApiKey: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          label: z.string().min(1, "Label is required").max(64),
        })
      )
      .mutation(async ({ input }) => {
        const { email, label } = input;

        // Verify active subscription
        const sub = await getActiveSubscriptionForEmail(email);
        if (!sub) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "An active subscription is required to generate API keys.",
          });
        }

        const result = await generateApiKey({ email, label });
        if (!result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate API key. Please try again.",
          });
        }

        return {
          id: result.id,
          rawKey: result.rawKey, // shown ONCE
          keyPrefix: result.keyPrefix,
          label: result.label,
          createdAt: result.createdAt.toISOString(),
        };
      }),

    /** Revoke an API key by ID. */
    revokeApiKey: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          keyId: z.number().int().positive(),
        })
      )
      .mutation(async ({ input }) => {
        const ok = await revokeApiKey(input.keyId, input.email);
        if (!ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to revoke key.",
          });
        }
        return { success: true };
      }),
  }),

  /**
   * Public verification procedures — power the /verify page on citation.is.
   * Uses the upstream ttruthdesk public verification endpoint and normalizes
   * the response to the frontend verdict-card schema.
   */
  verify: router({
    verifyClaim: publicProcedure
      .input(
        z.object({
          claimText: z.string().trim().min(10).max(2000),
        })
      )
      .mutation(async ({ input }) => {
        const res = await fetch("https://ttruthdesk.claims/api/public/verify-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim: input.claimText }),
          signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: `Verification upstream returned ${res.status}. Please try again.`,
          });
        }

        const data = (await res.json()) as {
          claimText?: string;
          verdict?: string;
          rationale?: string;
          evidenceUrl?: string | null;
          signalDensity?: number;
          pubmedResults?: Array<{ url?: string | null; citationUrl?: string | null }>;
        };

        const verdict = mapUpstreamVerdict(data.verdict ?? "");
        const shareId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        const sourceUrls = uniqueUrls([
          data.evidenceUrl ?? null,
          ...(data.pubmedResults ?? []).flatMap(result => [result.url ?? null, result.citationUrl ?? null]),
        ]);

        const result: StoredVerification = {
          shareId,
          claimText: data.claimText ?? input.claimText,
          verdict,
          confidenceScore: confidenceForVerdict(verdict, data.signalDensity),
          evidenceSummary: data.rationale ?? "Verification completed.",
          sourceUrls,
        };

        verificationStore.set(shareId, result);
        return result;
      }),
    getVerification: publicProcedure
      .input(z.object({ shareId: z.string().min(1) }))
      .query(({ input }) => {
        return verificationStore.get(input.shareId) ?? null;
      }),
  }),

  /**
   * Public pipeline status — proxies live stats from ttruthdesk.claims API.
   * Used by the /status page on citation.is.
   */
  status: router({
    /**
     * Domain coverage metrics — proxies /api/public/status/domains from ttruthdesk.
     * Returns per-domain claim counts, verification rates, and totals.
     * Used by the domain coverage widget on the /status page.
     */
    domains: publicProcedure.query(async () => {
      try {
        const res = await fetch("https://ttruthdesk.claims/api/public/status/domains", {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`ttruthdesk domains returned ${res.status}`);
        const data = (await res.json()) as {
          domains: Array<{
            domain: string;
            label: string;
            totalClaims: number;
            supportedClaims: number;
            verificationRate: number;
            totalDocuments: number;
            completedDocuments: number;
          }>;
          totals: {
            totalClaims: number;
            supportedClaims: number;
            totalDocuments: number;
          };
          updatedAt: string;
        };
        return { ok: true, ...data };
      } catch (e) {
        console.warn("[status.domains] Failed to fetch domain stats:", e);
        return {
          ok: false,
          domains: [] as Array<{
            domain: string;
            label: string;
            totalClaims: number;
            supportedClaims: number;
            verificationRate: number;
            totalDocuments: number;
            completedDocuments: number;
          }>,
          totals: { totalClaims: 0, supportedClaims: 0, totalDocuments: 0 },
          updatedAt: new Date().toISOString(),
        };
      }
    }),
    pipeline: publicProcedure.query(async () => {
      try {
        const res = await fetch("https://ttruthdesk.claims/api/public/stats", {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`ttruthdesk stats returned ${res.status}`);
        const data = (await res.json()) as Record<string, unknown>;
        return {
          ok: true,
          totalClaims: (data.totalClaims as number) ?? 0,
          verifiedClaims: (data.verifiedClaims as number) ?? 0,
          totalDocuments: (data.totalDocuments as number) ?? 0,
          lastIngestAt: (data.lastIngestAt as string | null) ?? null,
          lastQualityPassAt: (data.lastQualityPassAt as string | null) ?? null,
          verticals: (data.verticals as string[]) ?? [],
          siaGeneration: (data.siaGeneration as number) ?? 1,
          siaUpgradeRate: (data.siaUpgradeRate as number | null) ?? null,
        };
      } catch (e) {
        // Graceful degradation — return zeroes rather than 500
        console.warn("[status.pipeline] Failed to fetch ttruthdesk stats:", e);
        return {
          ok: false,
          totalClaims: 0,
          verifiedClaims: 0,
          totalDocuments: 0,
          lastIngestAt: null,
          lastQualityPassAt: null,
          verticals: [],
          siaGeneration: 1,
          siaUpgradeRate: null,
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
