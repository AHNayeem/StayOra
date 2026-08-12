"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useRbac } from "../rbac/rbac-provider";
import type { RbacContextValue } from "../rbac/types";
import { DASHBOARD_MENU } from "./menu-config";
import { useBadgeCounts } from "./use-badge-counts";
import type { MenuNode, ResolvedMenuNode } from "./types";

/** Is `href` the active route for the current `pathname`? */
function isHrefActive(href: string | undefined, pathname: string): boolean {
  if (!href) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Can the current user see this node (ignoring children)? */
function nodeVisible(node: MenuNode, rbac: RbacContextValue): boolean {
  if (node.featureFlag && !rbac.hasFeature(node.featureFlag)) return false;
  if (node.permissions && !rbac.canAll(node.permissions)) return false;
  if (node.anyPermission && !rbac.canAny(node.anyPermission)) return false;
  return true;
}

/**
 * Filter + resolve a menu subtree for the current user and route.
 * Prunes nodes the user cannot access and group nodes left with no reachable
 * children, then annotates depth and active state bottom-up.
 */
function resolveNodes(
  nodes: MenuNode[],
  rbac: RbacContextValue,
  pathname: string,
  depth: number,
  counts: Record<string, number>,
): ResolvedMenuNode[] {
  const out: ResolvedMenuNode[] = [];
  for (const node of nodes) {
    if (!nodeVisible(node, rbac)) continue;

    const children = node.children
      ? resolveNodes(node.children, rbac, pathname, depth + 1, counts)
      : undefined;

    // A group (no href) with no surviving children is meaningless — drop it.
    if (!node.href && (!children || children.length === 0)) continue;

    const active =
      isHrefActive(node.href, pathname) ||
      (children?.some((c) => c.active) ?? false);

    // Resolve a live count into the badge label; a zero count hides the badge
    // entirely rather than showing a distracting "0".
    let badge = node.badge;
    if (badge?.countKey) {
      const count = counts[badge.countKey] ?? 0;
      badge = count > 0 ? { ...badge, label: String(count) } : undefined;
    }

    out.push({ ...node, badge, children, depth, active });
  }
  return out;
}

/** Flatten a resolved tree into just its navigable (href-bearing) leaves. */
function flattenLinks(nodes: ResolvedMenuNode[]): ResolvedMenuNode[] {
  return nodes.flatMap((n) => [
    ...(n.href ? [n] : []),
    ...(n.children ? flattenLinks(n.children) : []),
  ]);
}

export interface UseDashboardMenuResult {
  /** The access-filtered, route-annotated tree for the sidebar. */
  tree: ResolvedMenuNode[];
  /** Flat list of every reachable link — powers search & command palette. */
  links: ResolvedMenuNode[];
  /** Filter links by a free-text query (case-insensitive label match). */
  search: (query: string) => ResolvedMenuNode[];
}

/**
 * The single source of navigation state for the shell. Consumes the DB-driven
 * config, applies RBAC + feature flags, and reacts to the active route. Every
 * navigation surface (sidebar, breadcrumb, command palette) reads from here so
 * access rules are enforced in exactly one place.
 */
export function useDashboardMenu(): UseDashboardMenuResult {
  const rbac = useRbac();
  const pathname = usePathname();
  const counts = useBadgeCounts();
  const countsKey = JSON.stringify(counts);

  return useMemo(() => {
    const tree = resolveNodes(DASHBOARD_MENU, rbac, pathname, 0, counts);
    const links = flattenLinks(tree);
    return {
      tree,
      links,
      search: (query: string) => {
        const q = query.trim().toLowerCase();
        if (!q) return links;
        return links.filter((l) => l.label.toLowerCase().includes(q));
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rbac, pathname, countsKey]);
}
