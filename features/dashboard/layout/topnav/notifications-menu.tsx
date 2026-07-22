"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { MenuPopover, MenuTriggerButton } from "./menu-popover";

/**
 * Notifications skeleton. Phase 1 renders the panel shell with an empty state;
 * the live feed, unread count and real-time updates land in Phase 5. The count
 * prop is wired now so the badge is ready.
 */
export function NotificationsMenu({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <MenuPopover
      label="Notifications"
      panelClassName="w-80"
      trigger={({ props }) => (
        <MenuTriggerButton label="Notifications" count={unreadCount} buttonProps={props}>
          <Bell className="size-5" aria-hidden="true" />
        </MenuTriggerButton>
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm font-semibold text-ink">Notifications</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-field px-2 py-1 text-xs text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <CheckCheck className="size-3.5" aria-hidden="true" />
          Mark all read
        </button>
      </div>
      <div className="grid place-items-center gap-2 px-4 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-surface-muted text-muted">
          <Bell className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted">You&rsquo;re all caught up.</p>
      </div>
      <Link
        href="/dashboard/notifications"
        className="block rounded-field px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        View all
      </Link>
    </MenuPopover>
  );
}
