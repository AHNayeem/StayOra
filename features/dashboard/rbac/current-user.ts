import type { CurrentUser, RoleId } from "./types";
import { expandPermissions, getRole } from "./roles";
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
  /** B2B account the user belongs to — scopes agency queries. */
  organizationId?: string;
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
  return {
    id: principal.id,
    name: principal.name,
    email: principal.email,
    avatarUrl: principal.avatarUrl,
    roleId: role.id,
    permissions: expandPermissions(role.permissions),
    // Feature flags are fetched per tenant/user; seed from the shared default
    // set so the flag provider and this principal never drift apart.
    featureFlags: [...DEFAULT_ENABLED_FLAGS],
    organizationId: principal.organizationId ?? "org_stayora",
    merchantId: principal.merchantId,
  };
}
