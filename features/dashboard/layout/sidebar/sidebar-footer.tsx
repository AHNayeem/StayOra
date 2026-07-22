"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { useRbac } from "../../rbac/rbac-provider";
import { getRole } from "../../rbac/roles";
import { useShell } from "../shell-context";

/**
 * Sidebar footer — shows the signed-in user and their role, with a shortcut to
 * settings. Collapses to just the avatar in the icon rail.
 */
export function SidebarFooter() {
  const { collapsed } = useShell();
  const { user } = useRbac();
  const role = getRole(user.roleId);

  return (
    <div className="shrink-0 border-t border-line p-3">
      <div
        className={cn(
          "flex items-center gap-3 rounded-field p-2",
          collapsed && "justify-center p-0",
        )}
      >
        <Avatar name={user.name} src={user.avatarUrl} size="sm" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {role.label}
              </span>
            </span>
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              className="rounded-field p-2 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Settings className="size-4" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
