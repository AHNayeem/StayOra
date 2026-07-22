"use client";

import Link from "next/link";
import { CircleUser, LogOut, Settings, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useRbac } from "../../rbac/rbac-provider";
import { getRole } from "../../rbac/roles";
import { MenuPopover } from "./menu-popover";

const LINKS = [
  { id: "profile", label: "My profile", href: "/dashboard/profile", icon: CircleUser },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
  { id: "roles", label: "Roles & access", href: "/dashboard/roles", icon: ShieldCheck },
];

/** Account menu — identity summary plus profile/settings links and sign out. */
export function ProfileMenu() {
  const { user } = useRbac();
  const role = getRole(user.roleId);

  return (
    <MenuPopover
      label="Account"
      panelClassName="w-64"
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
      <div className="border-t border-line pt-1">
        <Link
          href="/"
          role="menuitem"
          className="flex items-center gap-3 rounded-field px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Link>
      </div>
    </MenuPopover>
  );
}
