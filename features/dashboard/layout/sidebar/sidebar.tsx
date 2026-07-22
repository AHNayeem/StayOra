"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils";
import { useDashboardMenu } from "../../navigation/use-dashboard-menu";
import { useShell } from "../shell-context";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav, SidebarSearchResults } from "./sidebar-nav";

/**
 * The dashboard sidebar body — brand, menu search, the RBAC-filtered nav tree
 * and a user footer. Shared by the desktop rail and the mobile drawer; layout
 * chrome (fixed width, borders) is applied by the parent so this stays reusable.
 */
export function SidebarContent() {
  const { collapsed, toggleCollapsed, setMobileOpen } = useShell();
  const { tree, search } = useDashboardMenu();
  const [query, setQuery] = useState("");

  const results = query ? search(query) : [];

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Brand + collapse toggle */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 border-b border-line px-4",
          collapsed && "justify-center px-0",
        )}
      >
        <Link
          href="/dashboard"
          aria-label={`${siteConfig.name} dashboard`}
          className="inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-card bg-primary text-white">
            <Compass className="size-5" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight text-ink">
              {siteConfig.name}
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="ml-auto hidden rounded-field p-2 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex"
          >
            <PanelLeftClose className="size-5" aria-hidden="true" />
          </button>
        )}
        {/* Close button (mobile drawer only) */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="ml-auto rounded-field p-2 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Collapsed expand affordance */}
      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expand sidebar"
          className="mx-auto mt-2 hidden rounded-field p-2 text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex"
        >
          <PanelLeftOpen className="size-5" aria-hidden="true" />
        </button>
      )}

      {/* Menu search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu…"
              aria-label="Search menu"
              className="h-10 w-full rounded-field border border-line bg-surface-muted pl-9 pr-3 text-sm text-ink placeholder:text-muted focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
        </div>
      )}

      {query && !collapsed ? (
        <SidebarSearchResults results={results} query={query} />
      ) : (
        <SidebarNav tree={tree} />
      )}

      <SidebarFooter />
    </div>
  );
}
