"use client";

import { useCallback, useMemo } from "react";
import {
  MERCHANT_ROLES,
  merchantRoleCan,
  type MerchantCapability,
  type MerchantRoleId,
} from "../domain/merchants";
import { useRbac } from "./rbac-provider";

export interface MerchantAccess {
  /** The principal's job inside the merchant account, if they have one. */
  role: MerchantRoleId | null;
  /** Human label for that job. */
  roleLabel: string | null;
  /** Is this principal part of a merchant account at all? */
  isMerchantUser: boolean;
  /** Central capability check — components never compare role ids. */
  can: (capability: MerchantCapability) => boolean;
  /** Every listed capability. */
  canAll: (capabilities: MerchantCapability[]) => boolean;
}

/**
 * Merchant-side access for the signed-in principal.
 *
 * The one place merchant UI asks "may this person do that". Pairs with
 * {@link import("./current-user").resolveCurrentUser}, which already narrows the
 * principal's *platform* permissions to the same role — this hook is for the
 * finer-grained, merchant-shaped questions a platform permission can't express
 * ("may they change payout details" vs "may they read finance").
 */
export function useMerchantAccess(): MerchantAccess {
  const { user } = useRbac();
  const role = user.merchantRole ?? null;

  const can = useCallback(
    (capability: MerchantCapability) => merchantRoleCan(role ?? undefined, capability),
    [role],
  );

  return useMemo(
    () => ({
      role,
      roleLabel: role ? MERCHANT_ROLES[role].label : null,
      isMerchantUser: Boolean(user.merchantId),
      can,
      canAll: (capabilities: MerchantCapability[]) => capabilities.every(can),
    }),
    [role, user.merchantId, can],
  );
}
