import type { CurrentUser, MerchantStaffRoleId, Permission, RoleId } from "./types";
import { expandPermissions, getRole } from "./roles";
import { merchantRolePermissions } from "../domain/merchants";
import { permissionMatches } from "./access";
import { resolveEnabledFlags } from "../feature-flags/flag-store";

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
 * The concrete grants a principal holds: their role's permissions, narrowed by
 * their merchant-side job when they have one.
 *
 * Split out of {@link resolveCurrentUser} because the client needs to redo this
 * calculation whenever the role registry changes — editing a role's permissions
 * must take effect without signing out (see `RbacProvider`).
 */
export function derivePermissions(
  roleId: RoleId,
  merchantRole?: MerchantStaffRoleId,
): Permission[] {
  const role = getRole(roleId);
  const permissions = expandPermissions(role.permissions);
  // An owner already holds everything the merchant role grants, so the
  // intersection is a no-op there — skip it and keep the wildcard grants intact.
  if (!merchantRole || merchantRole === "owner") return permissions;
  return intersectWithMerchantRole(permissions, merchantRole);
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

  const isMerchantPrincipal = role.id === "merchant" || role.id === "vendor";
  const merchantRole = isMerchantPrincipal ? (principal.merchantRole ?? "owner") : undefined;
  const permissions = derivePermissions(role.id, merchantRole);

  return {
    id: principal.id,
    name: principal.name,
    email: principal.email,
    avatarUrl: principal.avatarUrl,
    roleId: role.id,
    permissions,
    // Feature flags are resolved per tenant *and* role from the same store the
    // flag provider reads, so the principal and the provider never drift apart.
    featureFlags: resolveEnabledFlags(role.id),
    organizationId: principal.organizationId ?? "org_stayora",
    merchantId: principal.merchantId,
    merchantRole,
  };
}
