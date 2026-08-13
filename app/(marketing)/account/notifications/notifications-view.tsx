"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CreditCard,
  Gift,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldCheck,
  Smartphone,
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
import {
  CHANNEL_LABELS,
  MESSAGE_CATEGORY_LABELS,
  MESSAGE_CHANNELS,
  messagingService,
  type MessageCategory,
  type MessageChannel,
  type OutboundMessage,
} from "@/features/dashboard/domain";
import {
  useCustomerEmail,
  useCustomerInbox,
  useNotificationPreferences,
} from "@/features/booking";
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

const CATEGORY_ICONS: Record<MessageCategory, typeof Bell> = {
  booking: CalendarCheck,
  payment: CreditCard,
  refund: CreditCard,
  reminder: Bell,
  review: Star,
  support: LifeBuoy,
  security: ShieldCheck,
  marketing: Gift,
};

const CHANNEL_ICONS: Record<MessageChannel, typeof Bell> = {
  email: Mail,
  sms: Smartphone,
  push: Bell,
  whatsapp: MessageSquare,
  inapp: Bell,
};

type Tab = "inbox" | "preferences";

/**
 * Notifications — the traveller's in-app inbox and their channel preferences.
 *
 * Messages here are the in-app copies of what the platform "sent": the same
 * records the admin delivery log shows, produced by the same templates. Turning
 * a channel off is honoured by the dispatcher for anything that isn't
 * transactional or security-related.
 */
export function NotificationsView() {
  const [tab, setTab] = useState<Tab>("inbox");
  const legacy = useNotifications();
  const inbox = useCustomerInbox();
  const email = useCustomerEmail();
  const unread =
    legacy.filter((n) => !n.read).length + inbox.filter((m) => m.status !== "read").length;

  return (
    <div>
      <AccountPageHeader
        title="Notifications"
        description={unread > 0 ? `You have ${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 && tab === "inbox" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                markAllRead();
                messagingService.markAllRead(email);
              }}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <nav className="mb-6 flex gap-1 border-b border-line" aria-label="Notification sections">
        {(
          [
            ["inbox", "Inbox"],
            ["preferences", "Preferences"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "inbox" ? (
        <Inbox legacy={legacy} messages={inbox} />
      ) : (
        <Preferences email={email} />
      )}
    </div>
  );
}

function Inbox({
  legacy,
  messages,
}: {
  legacy: AccountNotification[];
  messages: OutboundMessage[];
}) {
  if (legacy.length === 0 && messages.length === 0) {
    return (
      <AccountEmpty
        icon={BellOff}
        title="No notifications"
        description="Booking updates, payment receipts and offers will show up here."
      />
    );
  }

  return (
    <ul className="grid gap-2">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
      {legacy.map((notification) => (
        <LegacyRow key={notification.id} notification={notification} />
      ))}
    </ul>
  );
}

function MessageRow({ message }: { message: OutboundMessage }) {
  const { dateTime } = useLocale();
  const Icon = CATEGORY_ICONS[message.category] ?? Bell;
  const unread = message.status !== "read";

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
          unread ? "bg-primary-50 text-primary" : "bg-surface-muted text-muted",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate font-medium", unread ? "text-ink" : "text-body")}>
            {message.subject}
          </p>
          {unread && (
            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-line text-sm text-body">{message.body}</p>
        <p className="mt-1 text-xs text-muted">
          {dateTime(message.createdAt)}
          {message.bookingRef ? ` · ${message.bookingRef}` : ""}
        </p>
      </div>
    </>
  );

  const className = cn(
    "flex gap-3 rounded-card border p-4 text-left transition-colors",
    unread
      ? "border-primary/20 bg-primary-50/40 hover:bg-primary-50/70"
      : "border-line bg-surface",
  );

  return (
    <li>
      {message.href ? (
        <Link
          href={message.href}
          onClick={() => messagingService.markRead(message.id)}
          className={className}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => messagingService.markRead(message.id)}
          className={cn(className, "w-full")}
        >
          {body}
        </button>
      )}
    </li>
  );
}

function LegacyRow({ notification }: { notification: AccountNotification }) {
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
        <Link
          href={notification.href}
          onClick={() => markRead(notification.id)}
          className={className}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => markRead(notification.id)}
          className={cn(className, "w-full")}
        >
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

/** Transactional categories that can't be switched off. */
const LOCKED: MessageCategory[] = ["booking", "payment", "refund", "security"];

function Preferences({ email }: { email: string }) {
  const preferences = useNotificationPreferences();
  const categories = Object.keys(MESSAGE_CATEGORY_LABELS) as MessageCategory[];
  const channels = MESSAGE_CHANNELS.filter((channel) => channel !== "inapp");

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
      <table className="w-full min-w-xl text-sm">
        <caption className="sr-only">Notification channel preferences</caption>
        <thead className="border-b border-line bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              What
            </th>
            {channels.map((channel) => {
              const Icon = CHANNEL_ICONS[channel];
              return (
                <th key={channel} scope="col" className="px-4 py-3 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="size-3.5" aria-hidden="true" />
                    {CHANNEL_LABELS[channel]}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {categories.map((category) => {
            const locked = LOCKED.includes(category);
            return (
              <tr key={category}>
                <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                  {MESSAGE_CATEGORY_LABELS[category]}
                  {locked && (
                    <span className="ml-2 text-xs font-normal text-muted">Always on</span>
                  )}
                </th>
                {channels.map((channel) => (
                  <td key={channel} className="px-4 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={preferences[channel][category]}
                        disabled={locked && channel === "email"}
                        onChange={(event) =>
                          messagingService.setPreference(
                            email,
                            channel,
                            category,
                            event.target.checked,
                          )
                        }
                        aria-label={`${MESSAGE_CATEGORY_LABELS[category]} via ${CHANNEL_LABELS[channel]}`}
                        className="size-4 rounded border-line text-primary focus:ring-primary disabled:opacity-50"
                      />
                    </label>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line p-4 text-xs text-muted">
        Booking, payment and security emails can&rsquo;t be turned off — they&rsquo;re how we
        confirm what you&rsquo;ve paid for. In-app notifications always arrive in this inbox.
      </p>
    </div>
  );
}
