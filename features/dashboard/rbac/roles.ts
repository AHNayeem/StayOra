import type { Permission, Role, RoleId } from "./types";
import { PERMISSION_WILDCARD } from "./permissions";
import { BUILT_IN_ROLES, readAllPermissions } from "./role-catalogue";
import { getRoleRecord, listRoleRecords } from "./role-registry";

/**
 * The shipped role → permission seed.
 *
 * Kept as the immutable floor beneath the runtime registry: an admin may
 * override a role's grants at runtime (see `role-registry.ts`), and these
 * definitions are what "reset to default" restores.
 */
export const ROLES: Record<string, Role> = BUILT_IN_ROLES;

/**
 * Expand a role's permission list into concrete `resource:action` strings so
 * runtime checks never need to reason about wildcards.
 *
 * - `*:*`        → every resource × every read/write action
 * - `finance:*`  → every action on `finance`
 * - `bookings:read` → passed through unchanged
 */
export function expandPermissions(permissions: Permission[]): Permission[] {
  const out = new Set<Permission>();
  for (const p of permissions) {
    if (p === PERMISSION_WILDCARD) {
      out.add(PERMISSION_WILDCARD);
      continue;
    }
    const [resource, action] = p.split(":");
    if (action === "*") {
      // Keep the wildcard so `can()` can match any action cheaply.
      out.add(`${resource}:*`);
    }
    out.add(p);
  }
  return [...out];
}

/**
 * The roles that ship with the product, in display order.
 *
 * Evaluated at import time, so it never contains runtime-created roles — use
 * {@link listRoles} (or the `useRoles` hook) anywhere the live set matters.
 */
export const ROLE_LIST: Role[] = Object.values(BUILT_IN_ROLES);

/** Every role known right now: shipped + overridden + custom. */
export function listRoles(): Role[] {
  return listRoleRecords();
}

/**
 * Look up a role, falling back to the least-privileged known role.
 *
 * The fallback matters more than it used to: a custom role created in the
 * browser is unknown during a server render, and resolving it to `vendor` fails
 * closed rather than open. The client re-resolves once the registry hydrates.
 */
export function getRole(id: RoleId): Role {
  return getRoleRecord(id) ?? BUILT_IN_ROLES.vendor;
}

/** True when the runtime knows this role id at all. */
export function roleExists(id: RoleId): boolean {
  return Boolean(getRoleRecord(id));
}

/** Referenced so `READ_ALL` is available to callers assembling custom roles. */
export { readAllPermissions };
