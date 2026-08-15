import type { CurrentUser, MerchantStaffRoleId, Permission, RoleId } from "./types";
import { expandPermissions, getRole } from "./roles";
import { merchantRolePermissions } from "../domain/merchants";
import { permissionMatches } from "./access";
import { DEFAULT_ENABLED_FLAGS } from "../feature-flags/flags";

/** Identity fields a session supplies; the rest is derived from the role. */
export interface PrincipalInput {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  avatarUrl?: string;
  /** Merchant the user belongs to — scopes every merchant-facing query. */
  merchantId?: string;
  /** The user's job inside that merchant account. Defaults to `owner`. */
  merchantRole?: MerchantStaffRoleId;
  /** B2B account the user belongs to — scopes agency queries. */
  organizationId?: string;
}

/**
 * Narrow a merchant principal's grants to what their merchant-side job allows.
 *
 * The platform role says what a merchant *can* do at all; the merchant role says
 * what this person does there. Taking the intersection is what stops a Front
 * Desk account inheriting owner-level access — and it can only ever *remove*
 * permissions, never add one the platform role didn't grant.
 */
function intersectWithMerchantRole(
  granted: Permission[],
  merchantRole: MerchantStaffRoleId,
): Permission[] {
  const allowed = new Set(merchantRolePermissions(merchantRole));
  return granted.filter((permission) => permissionMatches(allowed, permission));
}

/**
 * Build the RBAC principal from a session identity.
 *
 * Permissions are always derived from the role (never trusted from the client),
 * so a tampered cookie can at most claim a role — and the role's grants are
 * fixed here. Swapping in a backend means fetching the role/permission payload
 * instead of reading {@link getRole}; the return shape doesn't change.
 */
export function resolveCurrentUser(
  input: PrincipalInput | RoleId = "super_admin",
): CurrentUser {
  const principal: PrincipalInput =
    typeof input === "string"
      ? {
          id: "usr_demo",
          name: "AH Nayeem",
          email: "nayeem@otithee.app",
          roleId: input,
        }
      : input;

  const role = getRole(principal.roleId);
  let permissions = expandPermissions(role.permissions);

  const isMerchantPrincipal = role.id === "merchant" || role.id === "vendor";
  const merchantRole = isMerchantPrincipal ? (principal.merchantRole ?? "owner") : undefined;
  // An owner already holds everything the merchant role grants, so the
  // intersection is a no-op there — skip it and keep the wildcard grants intact.
  if (merchantRole && merchantRole !== "owner") {
    permissions = intersectWithMerchantRole(permissions, merchantRole);
  }

  return {
    id: principal.id,
    name: principal.name,
    email: principal.email,
    avatarUrl: principal.avatarUrl,
    roleId: role.id,
    permissions,
    // Feature flags are fetched per tenant/user; seed from the shared default
    // set so the flag provider and this principal never drift apart.
    featureFlags: [...DEFAULT_ENABLED_FLAGS],
    organizationId: principal.organizationId ?? "org_stayora",
    merchantId: principal.merchantId,
    merchantRole,
  };
}
