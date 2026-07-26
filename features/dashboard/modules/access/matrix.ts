import type { Role } from "../../rbac/types";
import { PERMISSION_WILDCARD, type Resource } from "../../rbac/permissions";

export type Coverage = "full" | "partial" | "none";

/**
 * How much of a resource a role can touch, derived from its (un-expanded)
 * permission seed:
 *  - `full`    → holds `*:*` or `<resource>:*`
 *  - `partial` → holds one or more specific `<resource>:<action>` grants
 *  - `none`    → no grant on the resource
 */
export function resourceCoverage(role: Role, resource: Resource): Coverage {
  if (role.permissions.includes(PERMISSION_WILDCARD)) return "full";
  if (role.permissions.includes(`${resource}:*`)) return "full";
  if (role.permissions.some((p) => p.startsWith(`${resource}:`))) return "partial";
  return "none";
}

/** Count the concrete (non-wildcard) permission grants a role lists. */
export function grantCount(role: Role): number {
  if (role.permissions.includes(PERMISSION_WILDCARD)) return Infinity;
  return role.permissions.length;
}
