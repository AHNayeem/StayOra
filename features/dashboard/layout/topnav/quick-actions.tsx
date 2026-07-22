"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardIcon } from "../../navigation/dashboard-icons";
import { useHasAccess } from "../../rbac/permission-guard";
import type { Permission } from "../../rbac/types";
import { MenuPopover } from "./menu-popover";

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: string;
  anyPermission?: Permission[];
}

/**
 * Quick actions catalogue. Data-driven and RBAC-gated so it can move to the API
 * later; actions the user can't perform are hidden.
 */
const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-booking", label: "New booking", href: "/dashboard/bookings/create", icon: "CalendarCheck", anyPermission: ["bookings:create"] },
  { id: "new-merchant", label: "Invite merchant", href: "/dashboard/merchants/create", icon: "Store", anyPermission: ["merchants:create"] },
  { id: "new-listing", label: "Add listing", href: "/dashboard/catalog/hotels/create", icon: "Boxes", anyPermission: ["catalog:create"] },
  { id: "new-promo", label: "Create promotion", href: "/dashboard/promotions/create", icon: "BadgePercent", anyPermission: ["promotions:create"] },
];

function QuickActionLink({ action }: { action: QuickAction }) {
  const allowed = useHasAccess({ anyPermission: action.anyPermission });
  if (!allowed) return null;
  return (
    <Link
      href={action.href}
      role="menuitem"
      className="flex items-center gap-3 rounded-field px-3 py-2 text-sm text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <DashboardIcon name={action.icon} className="size-4 text-primary" aria-hidden="true" />
      {action.label}
    </Link>
  );
}

/** "Create" menu of common actions, each gated by permission. */
export function QuickActions() {
  return (
    <MenuPopover
      label="Quick actions"
      panelClassName="min-w-52"
      trigger={({ open, props }) => (
        <button
          type="button"
          className={`inline-flex h-10 items-center gap-1.5 rounded-field bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${open ? "bg-primary-600" : ""}`}
          {...props}
        >
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Create</span>
        </button>
      )}
    >
      <p className="px-3 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
        Quick actions
      </p>
      {QUICK_ACTIONS.map((action) => (
        <QuickActionLink key={action.id} action={action} />
      ))}
    </MenuPopover>
  );
}
