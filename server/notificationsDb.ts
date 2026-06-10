/**
 * Database helpers for the notifications and pushSubscriptions tables.
 */
import { and, desc, eq } from "drizzle-orm";
import {
  InsertNotification,
  InsertPushSubscription,
  notifications,
  pushSubscriptions,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(
  data: Omit<InsertNotification, "id" | "createdAt">
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notifications).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function getNotificationsForUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnreadForUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, userId));
}

// ─── Push Subscriptions ───────────────────────────────────────────────────────

export async function savePushSubscription(
  data: Omit<InsertPushSubscription, "id" | "createdAt">
) {
  const db = await getDb();
  if (!db) return;
  // Upsert by endpoint — avoid duplicates if the same browser re-subscribes
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, data.endpoint))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ userId: data.userId, p256dh: data.p256dh, auth: data.auth })
      .where(eq(pushSubscriptions.endpoint, data.endpoint));
  } else {
    await db.insert(pushSubscriptions).values(data);
  }
}

export async function deletePushSubscription(endpoint: string, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, userId)
      )
    );
}

export async function getPushSubscriptionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}
