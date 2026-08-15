"use client";

import { useRbac } from "../../rbac/rbac-provider";
import { useMerchant } from "../merchants/hooks";

/**
 * The signed-in principal's merchant account.
 *
 * Every merchant workspace screen starts here, so none of them has to decide
 * which merchant it is looking at — the session does.
 */
export function useOwnMerchant() {
  const { user } = useRbac();
  const query = useMerchant(user.merchantId ?? "");
  return { merchantId: user.merchantId, ...query };
}
