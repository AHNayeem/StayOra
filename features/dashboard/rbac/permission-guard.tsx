"use client";

import type { ReactNode } from "react";
import type { FeatureFlag, Permission } from "./types";
import { useRbac } from "./rbac-provider";

export interface AccessRequirement {
  /** Requires *all* of these permissions. */
  permissions?: Permission[];
  /** Requires *any* of these permissions. */
  anyPermission?: Permission[];
  /** Requires this feature flag to be enabled. */
  featureFlag?: FeatureFlag;
}

/** Pure predicate reused by the menu filter and guards. */
export function useHasAccess(req: AccessRequirement): boolean {
  const { canAll, canAny, hasFeature } = useRbac();
  if (req.featureFlag && !hasFeature(req.featureFlag)) return false;
  if (req.permissions && !canAll(req.permissions)) return false;
  if (req.anyPermission && !canAny(req.anyPermission)) return false;
  return true;
}

interface CanProps extends AccessRequirement {
  children: ReactNode;
  /** Rendered when access is denied. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * `<Can>` — inline conditional render. Shows `children` only when the current
 * user satisfies the requirement; otherwise renders `fallback` (or nothing).
 * Use for buttons, menu entries and any element that should simply disappear.
 */
export function Can({ children, fallback = null, ...req }: CanProps) {
  return useHasAccess(req) ? <>{children}</> : <>{fallback}</>;
}

interface PermissionGuardProps extends AccessRequirement {
  children: ReactNode;
  /**
   * Rendered when access is denied — typically a "Permission denied" state.
   * Distinct from {@link Can}: a guard is for whole pages/sections that must
   * communicate *why* content is hidden, not silently omit it.
   */
  fallback: ReactNode;
}

/**
 * `<PermissionGuard>` — wraps a page or section and swaps in a denied state
 * when the requirement is not met. Presentation-only; real enforcement also
 * happens server-side (Phase 3).
 */
export function PermissionGuard({
  children,
  fallback,
  ...req
}: PermissionGuardProps) {
  return useHasAccess(req) ? <>{children}</> : <>{fallback}</>;
}
