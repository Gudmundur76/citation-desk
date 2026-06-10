/**
 * Notification bell icon with unread badge and inbox drawer.
 *
 * - Shows a badge with the count of unread notifications
 * - Opens a slide-in drawer listing all notifications
 * - Marks individual or all notifications as read
 * - Includes a toggle for browser push notifications
 */
import { Bell, BellOff, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  audit: "bg-violet-100 text-violet-700",
  claim: "bg-emerald-100 text-emerald-700",
  search: "bg-sky-100 text-sky-700",
  info: "bg-slate-100 text-slate-600",
  error: "bg-red-100 text-red-700",
};

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: unreadCount = 0, error: countError } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: 30_000, retry: 2 }
  );

  const { data: notifications = [], isLoading, error: listError } = trpc.notifications.list.useQuery(
    undefined,
    { enabled: isAuthenticated && open, retry: 2 }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const { isSupported, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } =
    usePushNotifications();

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Inbox drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>
                Notifications
              </SheetTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 h-7 px-2"
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            {/* Push toggle */}
            {isSupported && (
              <div className="flex items-center justify-between mt-2 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="text-xs text-slate-600">
                  {isSubscribed ? "Browser push enabled" : "Enable browser push"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                >
                  {pushLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isSubscribed ? (
                    <BellOff className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-violet-600" />
                  )}
                </Button>
              </div>
            )}
          </SheetHeader>

          <Separator />

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto">
            {listError ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm text-red-500">Could not load notifications</p>
                <button
                  className="text-xs text-violet-600 hover:underline"
                  onClick={() => utils.notifications.list.invalidate()}
                >
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Bell className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "px-5 py-4 flex gap-3 cursor-pointer hover:bg-slate-50 transition-colors",
                      !n.read && "bg-violet-50/40"
                    )}
                    onClick={() => {
                      if (!n.read) markRead.mutate({ id: n.id });
                    }}
                  >
                    {/* Type pill */}
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded h-fit",
                        TYPE_COLORS[n.type] ?? TYPE_COLORS.info
                      )}
                    >
                      {n.type}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-slate-900" : "text-slate-700")}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-1" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-violet-600 hover:underline flex items-center gap-0.5"
                          >
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
