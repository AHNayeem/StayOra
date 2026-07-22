"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DashboardIcon } from "../../navigation/dashboard-icons";
import type { ResolvedMenuNode } from "../../navigation/types";
import { useShell } from "../shell-context";

interface SidebarNavItemProps {
  node: ResolvedMenuNode;
}

/** Map a menu badge variant to the Badge component's variant. */
function badgeVariant(v?: string) {
  return (v ?? "neutral") as "primary" | "accent" | "success" | "danger" | "neutral";
}

/**
 * A single sidebar entry. Recurses for nested children (unlimited depth) and
 * manages its own expanded state, opening automatically when it contains the
 * active route. In the collapsed rail only depth-0 icons show; activating a
 * group there expands the sidebar so its children become reachable.
 */
export function SidebarNavItem({ node }: SidebarNavItemProps) {
  const { collapsed, setCollapsed } = useShell();
  const hasChildren = !!node.children?.length;
  const [open, setOpen] = useState(node.active);

  const indent = node.depth > 0 ? { paddingLeft: `${node.depth * 0.75 + 0.75}rem` } : undefined;

  const rowClass = cn(
    "group/item relative flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    node.active
      ? "bg-primary-50 text-primary-700"
      : "text-body hover:bg-surface-muted hover:text-ink",
    collapsed && node.depth === 0 && "justify-center px-0",
  );

  const iconEl = node.icon ? (
    <DashboardIcon
      name={node.icon}
      className={cn("size-[1.15rem] shrink-0", node.active && "text-primary")}
      aria-hidden="true"
    />
  ) : (
    // Leaf children without icons get a dot connector for alignment.
    !collapsed && <span className="ml-1 size-1.5 shrink-0 rounded-full bg-line" aria-hidden="true" />
  );

  const badgeEl =
    node.badge?.label && !collapsed ? (
      <Badge size="sm" variant={badgeVariant(node.badge.variant)} className="ml-auto">
        {node.badge.label}
      </Badge>
    ) : null;

  // ---- Group node (has children) ----
  if (hasChildren) {
    const handleToggle = () => {
      if (collapsed) {
        setCollapsed(false);
        setOpen(true);
        return;
      }
      setOpen((v) => !v);
    };

    return (
      <li>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={collapsed ? undefined : open}
          aria-current={node.active ? "true" : undefined}
          title={collapsed ? node.label : undefined}
          className={rowClass}
          style={indent}
        >
          {iconEl}
          {!collapsed && <span className="truncate">{node.label}</span>}
          {badgeEl}
          {!collapsed && (
            <ChevronRight
              className={cn(
                "ml-auto size-4 shrink-0 text-muted transition-transform",
                open && "rotate-90",
                badgeEl && "ml-2",
              )}
              aria-hidden="true"
            />
          )}
        </button>

        {!collapsed && open && (
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {node.children!.map((child) => (
              <SidebarNavItem key={child.id} node={child} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // ---- Leaf node (link) ----
  if (!node.href) return null;

  return (
    <li>
      <Link
        href={node.href}
        aria-current={node.active ? "page" : undefined}
        title={collapsed ? node.label : undefined}
        target={node.external ? "_blank" : undefined}
        rel={node.external ? "noopener noreferrer" : undefined}
        className={rowClass}
        style={indent}
      >
        {node.active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
            aria-hidden="true"
          />
        )}
        {iconEl}
        {!collapsed && <span className="truncate">{node.label}</span>}
        {badgeEl}
      </Link>
    </li>
  );
}
