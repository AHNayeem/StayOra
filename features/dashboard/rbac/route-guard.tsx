"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FeatureDisabled, PermissionDenied } from "../components/state-views";
import { useRbac } from "./rbac-provider";
import { ruleForPath } from "./route-access";

/**
 * RouteGuard — enforces {@link ROUTE_RULES} for whatever route is rendering.
 *
 * Mounted once inside the shell, so *every* dashboard route is covered: typing
 * `/dashboard/finance/commission` as a merchant, or following a stale bookmark
 * after a role change, lands on a permission-denied state rather than the page.
 * Individual pages keep their own `<PermissionGuard>` for finer sections, and
 * the domain services enforce scope again on the data itself — three layers,
 * one rule set.
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { canAny, hasFeature, user } = useRbac();
  const rule = ruleForPath(pathname);

  if (!rule) return <>{children}</>;

  if (rule.featureFlag && !hasFeature(rule.featureFlag)) {
    return <FeatureDisabled />;
  }

  if (!canAny(rule.anyPermission)) {
    return (
      <PermissionDenied
        description={`Your role (${user.roleId.replace(/_/g, " ")}) doesn't include access to this section. Required: ${rule.anyPermission.join(" or ")}.`}
      />
    );
  }

  return <>{children}</>;
}
