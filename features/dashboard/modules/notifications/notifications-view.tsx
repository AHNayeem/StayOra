"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  Star,
  Store,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../ui";
import { EmptyState } from "../../components/state-views";
import { formatDateTime } from "../../lib/format";
import {
  useArchiveNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "./hooks";
import type { NotificationType } from "./types";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  booking: CalendarCheck,
  payment: Wallet,
  review: Star,
  merchant: Store,
  system: Bell,
};

type Filter = "all" | "unread";

/**
 * NotificationsView — the notification centre. Reads the feed through the
 * notifications service (`useNotifications`) and mutates read/archive state via
 * hooks that invalidate the cache; a real build swaps the service for the API
 * (and adds realtime) without touching this component.
 */
export function NotificationsView() {
  const { data, isLoading } = useNotifications();
  const items = useMemo(() => data ?? [], [data]);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const archive = useArchiveNotification();
  const [filter, setFilter] = useState<Filter>("all");

  const unreadCount = items.filter((n) => !n.read).length;
  const visible = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read) : items),
    [items, filter],
  );

  if (isLoading && items.length === 0) {
    return <NotificationsSkeleton />;
  }

  const TABS: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${items.length})` },
    { key: "unread", label: `Unread (${unreadCount})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-field border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                "rounded-[calc(var(--radius-field)-0.25rem)] px-3 py-1.5 text-sm font-medium transition-colors",
                filter === t.key
                  ? "bg-primary text-white"
                  : "text-body hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<CheckCheck className="size-4" />}
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
        >
          Mark all read
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="No notifications to show here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((n) => {
            const Icon = TYPE_ICON[n.type];
            return (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-card border border-line p-4 shadow-card transition-colors",
                  n.read ? "bg-surface" : "bg-primary-50/40",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary-50 text-primary-700">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-ink">{n.title}</p>
                    {!n.read && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-body">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(n.id)}
                      title="Mark as read"
                      className="inline-flex size-8 items-center justify-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <Check className="size-4" aria-hidden="true" />
                      <span className="sr-only">Mark as read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => archive.mutate(n.id)}
                    title="Dismiss"
                    className="inline-flex size-8 items-center justify-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <X className="size-4" aria-hidden="true" />
                    <span className="sr-only">Dismiss</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Placeholder shown while the feed loads. */
function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-9 w-48 animate-pulse rounded-field bg-surface-muted" />
        <div className="h-8 w-32 animate-pulse rounded-field bg-surface-muted" />
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-card"
          >
            <span className="size-9 shrink-0 animate-pulse rounded-field bg-surface-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
