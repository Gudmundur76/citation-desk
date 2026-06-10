/**
 * tRPC router for the notification inbox and Web Push subscriptions.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  countUnreadForUser,
  deletePushSubscription,
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from "../notificationsDb";

export const notificationsRouter = router({
  /** List the latest notifications for the authenticated user. */
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(({ ctx, input }) =>
      getNotificationsForUser(ctx.user.id, input?.limit ?? 50)
    ),

  /** Count unread notifications (used for the bell badge). */
  unreadCount: protectedProcedure.query(({ ctx }) =>
    countUnreadForUser(ctx.user.id)
  ),

  /** Mark a single notification as read. */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) =>
      markNotificationRead(input.id, ctx.user.id)
    ),

  /** Mark all notifications as read. */
  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    markAllNotificationsRead(ctx.user.id)
  ),

  /** Save a Web Push subscription from the browser. */
  subscribePush: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
      })
    )
    .mutation(({ ctx, input }) =>
      savePushSubscription({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      })
    ),

  /** Remove a Web Push subscription (user opts out). */
  unsubscribePush: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(({ ctx, input }) =>
      deletePushSubscription(input.endpoint, ctx.user.id)
    ),
});
