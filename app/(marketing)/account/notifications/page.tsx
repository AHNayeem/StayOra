"use client";

import Link from "next/link";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  Star,
  Ticket,
  X,
} from "lucide-react";
import type { AccountNotification, NotificationType } from "@/types/traveler";
import {
  markAllRead,
  markRead,
  removeNotification,
  useNotifications,
} from "@/features/account/notifications-store";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, typeof Bell> = {
  booking: CalendarCheck,
  payment: CreditCard,
  message: MessageSquare,
  promo: Ticket,
  review: Star,
  system: Bell,
};

/**
 * Notifications — the in-app feed. Reads the persisted notifications store, so
 * marking read / mark-all-read / dismiss update the list and the sidebar badge
 * instantly and survive reload.
 */
export default function NotificationsPage() {
  const notifications = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <AccountPageHeader
        title="Notifications"
        description={unread > 0 ? `You have ${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAllRead()}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {notifications.length > 0 ? (
        <ul className="grid gap-2">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </ul>
      ) : (
        <AccountEmpty
          icon={BellOff}
          title="No notifications"
          description="Booking updates, messages and offers will show up here."
        />
      )}
    </div>
  );
}

function NotificationRow({ notification }: { notification: AccountNotification }) {
  const { dateTime } = useLocale();
  const Icon = ICONS[notification.type];

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
          notification.read ? "bg-surface-muted text-muted" : "bg-primary-50 text-primary",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate font-medium", notification.read ? "text-body" : "text-ink")}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
          )}
        </div>
        <p className="mt-0.5 text-sm text-body">{notification.body}</p>
        <p className="mt-1 text-xs text-muted">{dateTime(notification.date)}</p>
      </div>
    </>
  );

  const className = cn(
    "flex gap-3 rounded-card border p-4 text-left transition-colors",
    notification.read
      ? "border-line bg-surface"
      : "border-primary/20 bg-primary-50/40 hover:bg-primary-50/70",
  );

  return (
    <li className="relative">
      {notification.href ? (
        <Link href={notification.href} onClick={() => markRead(notification.id)} className={className}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={() => markRead(notification.id)} className={cn(className, "w-full")}>
          {body}
        </button>
      )}
      <button
        type="button"
        onClick={() => removeNotification(notification.id)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}
