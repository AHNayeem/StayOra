"use client";

import { useMemo } from "react";
import { useRbac } from "../rbac/rbac-provider";
import type { DomainScope } from "./services";
import type { DomainActor, NotificationAudience } from "./types";

/**
 * The data scope the signed-in principal is allowed to see.
 *
 * This is where role becomes row-level security: a merchant principal always
 * carries `merchantId`, an agency principal always carries `organizationId`, and
 * every domain service call receives the scope — so a merchant literally cannot
 * fetch another merchant's bookings, refunds, commission or settlements, even by
 * hand-crafting a request. Platform roles get an empty scope (unrestricted).
 */
export function useDomainScope(): DomainScope {
  const { user } = useRbac();
  return useMemo<DomainScope>(() => {
    if (user.roleId === "merchant" || user.roleId === "vendor") {
      return { merchantId: user.merchantId };
    }
    // An agency sub-user is scoped exactly like the account owner: same
    // organization, less permission. Scope and permission are separate
    // questions, and conflating them is how a sub-user would leak.
    if (user.roleId === "agency" || user.roleId === "b2b_agent") {
      return { organizationId: user.organizationId };
    }
    return {};
  }, [user.roleId, user.merchantId, user.organizationId]);
}

/** The actor recorded on audit-log entries and booking timeline events. */
export function useDomainActor(): DomainActor {
  const { user } = useRbac();
  return useMemo<DomainActor>(
    () => ({
      id: user.id,
      name: user.name,
      role: user.roleId,
      merchantId: user.merchantId,
      organizationId: user.organizationId,
    }),
    [user.id, user.name, user.roleId, user.merchantId, user.organizationId],
  );
}

/** Which notification feed this principal reads. */
export function useNotificationAudience(): NotificationAudience {
  const { user } = useRbac();
  if (user.roleId === "merchant" || user.roleId === "vendor") return "merchant";
  if (user.roleId === "agency" || user.roleId === "b2b_agent") return "agency";
  return "admin";
}

/** Convenience flags used to shape role-specific copy and layout. */
export function useRoleView() {
  const { user } = useRbac();
  return useMemo(
    () => ({
      isMerchant: user.roleId === "merchant" || user.roleId === "vendor",
      isAgency: user.roleId === "agency" || user.roleId === "b2b_agent",
      isPlatform:
        user.roleId === "super_admin" ||
        user.roleId === "admin" ||
        user.roleId === "finance" ||
        user.roleId === "support" ||
        user.roleId === "staff" ||
        user.roleId === "marketing" ||
        user.roleId === "content_manager" ||
        user.roleId === "compliance" ||
        user.roleId === "auditor",
      roleId: user.roleId,
    }),
    [user.roleId],
  );
}
