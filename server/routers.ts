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
});

export type AppRouter = typeof appRouter;
