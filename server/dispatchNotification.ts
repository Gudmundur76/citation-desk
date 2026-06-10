/**
 * Central notification dispatcher.
 *
 * Saves a notification to the DB inbox and, if the user has push subscriptions,
 * also sends a Web Push message to all their registered browsers.
 *
 * Usage:
 *   await dispatchNotification(userId, {
 *     type: 'audit',
 *     title: 'Audit request received',
 *     body: 'We will review your submission and get back to you.',
 *     link: '/audit',
 *   })
 */
import { createNotification } from "./notificationsDb";
import { sendPushToUser } from "./pushDispatch";

export interface NotificationPayload {
  type?: string;
  title: string;
  body?: string;
  link?: string;
}

export async function dispatchNotification(
  userId: number,
  payload: NotificationPayload
): Promise<void> {
  // 1. Persist to inbox
  await createNotification({
    userId,
    type: payload.type ?? "info",
    title: payload.title,
    body: payload.body ?? null,
    link: payload.link ?? null,
    read: false,
  });

  // 2. Send Web Push (fire-and-forget — don't block the caller)
  sendPushToUser(userId, {
    title: payload.title,
    body: payload.body,
    link: payload.link,
  }).catch((err) => console.error("[Dispatch] Push error:", err));
}
