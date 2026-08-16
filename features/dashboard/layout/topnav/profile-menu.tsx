"use client";

import Link from "next/link";
import { CircleUser, LogOut, Settings, ShieldCheck, UserCog } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DEMO_B2B_ACCOUNT_ID, DEMO_MERCHANT_ID } from "../../domain/seed";
import { useSession } from "../../auth/session-provider";
import { useRbac } from "../../rbac/rbac-provider";
import { useFeatureFlag } from "../../feature-flags/feature-flags-provider";
import { getRole } from "../../rbac/roles";
import type { RoleId } from "../../rbac/types";
import { MenuPopover } from "./menu-popover";

const LINKS = [
  { id: "profile", label: "My profile", href: "/dashboard/profile", icon: CircleUser },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
  { id: "roles", label: "Roles & access", href: "/dashboard/roles", icon: ShieldCheck },
];

/**
 * Roles offered by the prototype's "view as" switcher, with the scope each one
 * needs. Demo tooling for *previewing a role*, distinct from impersonating a
 * *person* (Users → Impersonate), which carries an identity, a reason and an
 * audit trail. It is now gated behind `users:impersonate` like the real thing,
 * so a merchant can no longer promote themselves from the account menu.
 */
const VIEW_AS: { role: RoleId; label: string; merchantId?: string; organizationId?: string }[] = [
  { role: "super_admin", label: "Super Admin" },
  { role: "admin", label: "Admin" },
  { role: "merchant", label: "Merchant", merchantId: DEMO_MERCHANT_ID },
  { role: "agency", label: "Agency (B2B)", organizationId: DEMO_B2B_ACCOUNT_ID },
  { role: "finance", label: "Finance" },
  { role: "support", label: "Support" },
];

/** Account menu — identity summary, profile links, role switcher and sign out. */
export function ProfileMenu() {
  const { user, can } = useRbac();
  const { signOut, viewAsRole, impersonator } = useSession();
  const hasImpersonation = useFeatureFlag("impersonation");
  const role = getRole(user.roleId);
  // Never offer a role switch mid-impersonation: the exit path is the banner,
  // and stacking the two would make "who am I really" unanswerable.
  const showViewAs = can("users:impersonate") && hasImpersonation && !impersonator;

  return (
    <MenuPopover
      label="Account"
      panelClassName="w-72"
      trigger={({ props }) => (
        <button
          type="button"
          aria-label="Account menu"
          className="flex items-center gap-2 rounded-field p-1 pr-2 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          {...props}
        >
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        </button>
      )}
    >
      <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
        <Avatar name={user.name} src={user.avatarUrl} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
          <span className="mt-1 inline-block rounded-pill bg-primary-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-700">
            {role.label}
          </span>
        </span>
      </div>
      <div className="py-1">
        {LINKS.map(({ id, label, href, icon: Icon }) => (
          <Link
            key={id}
            href={href}
            role="menuitem"
            className="flex items-center gap-3 rounded-field px-3 py-2 text-sm text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon className="size-4 text-muted" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>

      {showViewAs && (
      <div className="border-t border-line py-1">
        <p className="flex items-center gap-2 px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted">
          <UserCog className="size-3.5" aria-hidden="true" />
          View as (demo)
        </p>
        <div className="grid grid-cols-2 gap-1 px-2 pb-1">
          {VIEW_AS.map((entry) => (
            <button
              key={entry.role}
              type="button"
              role="menuitem"
              aria-current={user.roleId === entry.role ? "true" : undefined}
              onClick={() =>
                viewAsRole(entry.role, {
                  merchantId: entry.merchantId,
                  organizationId: entry.organizationId,
                })
              }
              className={
                user.roleId === entry.role
                  ? "rounded-field bg-primary-50 px-2 py-1.5 text-left text-xs font-semibold text-primary-700"
                  : "rounded-field px-2 py-1.5 text-left text-xs text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="border-t border-line pt-1">
        <button
          type="button"
          role="menuitem"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </MenuPopover>
  );
}
