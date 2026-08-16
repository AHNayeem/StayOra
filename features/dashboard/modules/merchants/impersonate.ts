import type { ImpersonationTarget } from "../../auth/impersonation";
import type { Merchant } from "./types";

/**
 * The principal a platform user becomes when impersonating a merchant.
 *
 * A merchant account is an organization, not a person, so impersonation targets
 * the *owner* staff member — with the account's contact as the fallback for
 * merchants that predate staff records. The `merchantId` is what makes every
 * scoped query return that merchant's rows and nothing else.
 */
export function merchantImpersonationTarget(merchant: Merchant): ImpersonationTarget {
  const owner =
    merchant.staff.find((s) => s.role === "owner" && s.status === "active") ??
    merchant.staff.find((s) => s.status === "active");

  return {
    id: owner?.id ?? `${merchant.id}_owner`,
    name: owner?.name ?? merchant.contactName,
    email: owner?.email ?? merchant.email,
    roleId: "merchant",
    merchantId: merchant.id,
    merchantRole: owner?.role ?? "owner",
    accountRole: "merchant",
    kind: "merchant",
    label: merchant.name,
  };
}
