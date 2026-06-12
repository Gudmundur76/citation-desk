/**
 * Database helpers for the user_subscriptions table.
 * All functions use the shared Drizzle connection from server/db.ts.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userSubscriptions, type UserSubscription } from "../drizzle/schema";

export type PlanTier = "starter" | "diligence" | "platform";

/** Audit quota per plan tier (number of audits per subscription period). */
export const PLAN_LIMITS: Record<PlanTier, number> = {
  starter: 10,
  diligence: 50,
  platform: 9999, // effectively unlimited
};

/** Prices in USD cents (stored as integer to avoid float issues). */
export const PLAN_PRICES_USD: Record<PlanTier, number> = {
  starter: 1500,
  diligence: 5000,
  platform: 0, // custom / contact sales
};

/**
 * Create a pending subscription record when a PayPal order is created.
 * Returns the inserted subscription ID.
 */
export async function createPendingSubscription(params: {
  email: string;
  paypalOrderId: string;
  planTier: PlanTier;
}): Promise<number> {
  const { email, paypalOrderId, planTier } = params;
  const amountUsd = PLAN_PRICES_USD[planTier];
  const auditsLimit = PLAN_LIMITS[planTier];

  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const result = await dbConn.insert(userSubscriptions).values({
    email,
    paypalOrderId,
    planTier,
    status: "pending",
    auditsLimit,
    amountUsd,
    currency: "USD",
  });

  return (result as unknown as { insertId: number }).insertId;
}

/**
 * Activate a subscription after successful PayPal capture.
 * Sets status=active, records captureId, and sets activatedAt + expiresAt (1 year).
 */
export async function activateSubscription(params: {
  paypalOrderId: string;
  paypalCaptureId: string;
}): Promise<UserSubscription | null> {
  const { paypalOrderId, paypalCaptureId } = params;
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  await dbConn
    .update(userSubscriptions)
    .set({
      paypalCaptureId,
      status: "active",
      activatedAt: now,
      expiresAt,
    })
    .where(eq(userSubscriptions.paypalOrderId, paypalOrderId));

  const rows = await dbConn
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.paypalOrderId, paypalOrderId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Look up a subscription by PayPal order ID.
 */
export async function getSubscriptionByOrderId(
  paypalOrderId: string
): Promise<UserSubscription | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;

  const rows = await dbConn
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.paypalOrderId, paypalOrderId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Look up the most recent active subscription for an email address.
 */
export async function getActiveSubscriptionForEmail(
  email: string
): Promise<UserSubscription | null> {
  const dbConn = await getDb();
  if (!dbConn) return null;

  const rows = await dbConn
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.email, email))
    .limit(10);

  // Return the most recently activated subscription that is still active
  const active = rows
    .filter((s: UserSubscription) => s.status === "active")
    .sort((a: UserSubscription, b: UserSubscription) => (b.activatedAt?.getTime() ?? 0) - (a.activatedAt?.getTime() ?? 0));

  return active[0] ?? null;
}
