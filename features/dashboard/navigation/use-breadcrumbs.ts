"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { BreadcrumbItem } from "@/components/ui/breadcrumb";
import { DASHBOARD_MENU } from "./menu-config";
import type { MenuNode } from "./types";

/** Index every menu node by its href for label lookup. */
function indexByHref(nodes: MenuNode[], map: Map<string, string>): void {
  for (const n of nodes) {
    if (n.href) map.set(n.href, n.label);
    if (n.children) indexByHref(n.children, map);
  }
}

/** Turn a URL segment into a human label, e.g. "shared-rooms" → "Shared Rooms". */
function humanize(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Derive breadcrumb items from the current route and the menu config. Known
 * segments use their menu label; unknown ones (dynamic `[id]` values) are
 * humanized. The trail always starts at the dashboard root.
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();

  return useMemo(() => {
    const labels = new Map<string, string>();
    indexByHref(DASHBOARD_MENU, labels);

    const segments = pathname.split("/").filter(Boolean); // e.g. ["dashboard","finance","payments"]
    const items: BreadcrumbItem[] = [];
    let href = "";

    segments.forEach((segment, i) => {
      href += `/${segment}`;
      const isLast = i === segments.length - 1;
      const label = labels.get(href) ?? humanize(segment);
      items.push({ label, href: isLast ? undefined : href });
    });

    return items;
  }, [pathname]);
}
