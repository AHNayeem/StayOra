/**
 * Route-level access rules.
 *
 * Hiding a menu item is not access control: someone can always type the URL. So
 * every dashboard route also declares the permission it needs here, and the
 * shell's {@link import("./route-guard").RouteGuard} evaluates it on navigation
 * — including deep links, back/forward and client-side transitions.
 *
 * Rules are matched longest-prefix-first, so a specific child (e.g.
 * `/dashboard/finance/earnings`) can require less than its parent section.
 */

import type { Permission } from "./types";

export interface RouteRule {
  /** Path prefix this rule governs. */
  prefix: string;
  /** Any one of these permissions grants access. */
  anyPermission: Permission[];
  /** Optional feature flag that must also be enabled. */
  featureFlag?: string;
}

export const ROUTE_RULES: RouteRule[] = [
  // Operations
  { prefix: "/dashboard/bookings", anyPermission: ["bookings:read"] },
  { prefix: "/dashboard/catalog", anyPermission: ["catalog:read"] },
  { prefix: "/dashboard/flights", anyPermission: ["flights:read"] },
  { prefix: "/dashboard/merchants", anyPermission: ["merchants:read"] },
  { prefix: "/dashboard/customers", anyPermission: ["customers:read"] },

  // Money — merchants may read their own; only finance/admin may act.
  { prefix: "/dashboard/finance/earnings", anyPermission: ["finance:read"] },
  { prefix: "/dashboard/finance/settlements", anyPermission: ["finance:read"] },
  { prefix: "/dashboard/finance/commission", anyPermission: ["finance:read"] },
  { prefix: "/dashboard/finance/refunds", anyPermission: ["finance:read"] },
  { prefix: "/dashboard/finance", anyPermission: ["finance:read"] },

  // B2B
  { prefix: "/dashboard/b2b", anyPermission: ["b2b:read"] },

  // Growth
  { prefix: "/dashboard/promotions", anyPermission: ["promotions:read"] },
  { prefix: "/dashboard/reports", anyPermission: ["reports:read"] },
  { prefix: "/dashboard/analytics", anyPermission: ["analytics:read"], featureFlag: "analytics" },

  // Content
  { prefix: "/dashboard/cms", anyPermission: ["cms:read"] },
  { prefix: "/dashboard/reviews", anyPermission: ["reviews:read"] },
  { prefix: "/dashboard/localization", anyPermission: ["localization:read"] },

  // Access control
  { prefix: "/dashboard/users", anyPermission: ["users:read"] },
  { prefix: "/dashboard/roles", anyPermission: ["roles:read"] },
  { prefix: "/dashboard/permissions", anyPermission: ["permissions:read"] },

  // Platform
  { prefix: "/dashboard/settings", anyPermission: ["settings:read"] },
  { prefix: "/dashboard/logs", anyPermission: ["logs:read"] },
  { prefix: "/dashboard/system", anyPermission: ["system:read"] },
  { prefix: "/dashboard/design-system", anyPermission: ["system:read"] },
  { prefix: "/dashboard/notifications", anyPermission: ["notifications:read"] },
  { prefix: "/dashboard/support", anyPermission: ["support:read"] },

  // Always-available surfaces
  { prefix: "/dashboard/profile", anyPermission: ["profile:read"] },
  { prefix: "/dashboard/help", anyPermission: ["dashboard:read"] },
  { prefix: "/dashboard", anyPermission: ["dashboard:read"] },
];

/** The most specific rule governing `pathname`, or `null` if none applies. */
export function ruleForPath(pathname: string): RouteRule | null {
  let best: RouteRule | null = null;
  for (const rule of ROUTE_RULES) {
    const matches = pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
    if (!matches) continue;
    if (!best || rule.prefix.length > best.prefix.length) best = rule;
  }
  return best;
}
