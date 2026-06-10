/**
 * Web Push dispatch helper.
 *
 * Sends a push notification to all of a user's registered browser endpoints
 * using the VAPID keys stored in environment variables.
 */
import webpush from "web-push";
import { ENV } from "./_core/env";
import { getPushSubscriptionsForUser, deletePushSubscription } from "./notificationsDb";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = ENV.vapidPublicKey;
  const privateKey = ENV.vapidPrivateKey;
  if (!publicKey || !privateKey) {
    console.warn("[Push] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@citation.is",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body?: string;
  link?: string;
  icon?: string;
}

export async function sendPushToUser(
  userId: number,
  payload: PushPayload
): Promise<void> {
  ensureVapid();
  if (!vapidConfigured) return;

  const subs = await getPushSubscriptionsForUser(userId);
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    link: payload.link ?? "/",
    icon: payload.icon ?? "/favicon.ico",
  });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data
        );
      } catch (err: any) {
        // 410 Gone = subscription expired; clean it up
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await deletePushSubscription(sub.endpoint, userId);
        } else {
          console.error("[Push] Send error:", err?.message ?? err);
        }
      }
    })
  );
}
