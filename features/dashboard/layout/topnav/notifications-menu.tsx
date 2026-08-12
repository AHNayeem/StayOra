"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../../lib/format";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../../modules/notifications";
import { MenuPopover, MenuTriggerButton } from "./menu-popover";

/** Tone → dot colour for the leading status pip. */
const TONE_DOT: Record<string, string> = {
  success: "bg-primary",
  warning: "bg-accent",
  danger: "bg-danger",
  neutral: "bg-muted",
};

/**
 * Notifications menu — the live event feed for the signed-in principal.
 *
 * The list, the unread count and "mark all read" all go through the domain
 * notification service, and the feed is filtered by audience: a merchant sees
 * their bookings/refunds/settlements, an admin sees the platform's.
 */
export function NotificationsMenu() {
  const { data, isLoading } = useNotifications();
  const unread = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = (data?.items ?? []).slice(0, 6);
  const unreadCount = unread.data ?? 0;

  return (
    <MenuPopover
      label="Notifications"
      panelClassName="w-88"
      trigger={({ props }) => (
        <MenuTriggerButton label="Notifications" count={unreadCount} buttonProps={props}>
          <Bell className="size-5" aria-hidden="true" />
        </MenuTriggerButton>
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm font-semibold text-ink">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted">
              {unreadCount} unread
            </span>
          )}
        </span>
        <button
          type="button"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
          className="inline-flex items-center gap-1 rounded-field px-2 py-1 text-xs text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <CheckCheck className="size-3.5" aria-hidden="true" />
          Mark all read
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-field bg-surface-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-2 px-4 py-10 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-surface-muted text-muted">
            <Bell className="size-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted">You&rsquo;re all caught up.</p>
        </div>
      ) : (
        <ul className="max-h-96 overflow-y-auto py-1">
          {items.map((item) => {
            const body = (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    TONE_DOT[item.tone] ?? TONE_DOT.neutral,
                    item.read && "opacity-40",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm",
                      item.read ? "text-body" : "font-semibold text-ink",
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="block truncate text-xs text-muted">{item.body}</span>
                  <span className="block text-[0.6875rem] text-muted">
                    {formatDateTime(item.createdAt)}
                  </span>
                </span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => markRead.mutate(item.id)}
                    className="flex items-start gap-2.5 rounded-field px-3 py-2 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => markRead.mutate(item.id)}
                    className="flex w-full items-start gap-2.5 rounded-field px-3 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/dashboard/notifications"
        className="block rounded-field px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        View all
      </Link>
    </MenuPopover>
  );
}
