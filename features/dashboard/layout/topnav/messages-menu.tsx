"use client";

import { MessageSquare } from "lucide-react";
import { MenuPopover, MenuTriggerButton } from "./menu-popover";

/**
 * Messages skeleton. Feature-flag gated in the top nav; Phase 1 shows the empty
 * panel shell, with the inbox and threads arriving in a later phase.
 */
export function MessagesMenu({ unreadCount = 0 }: { unreadCount?: number }) {
  return (
    <MenuPopover
      label="Messages"
      panelClassName="w-80"
      trigger={({ props }) => (
        <MenuTriggerButton label="Messages" count={unreadCount} buttonProps={props}>
          <MessageSquare className="size-5" aria-hidden="true" />
        </MenuTriggerButton>
      )}
    >
      <div className="px-2 py-1.5 text-sm font-semibold text-ink">Messages</div>
      <div className="grid place-items-center gap-2 px-4 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-surface-muted text-muted">
          <MessageSquare className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted">No new messages.</p>
      </div>
    </MenuPopover>
  );
}
