/**
 * Pure permission-matching logic — no React, no context — so the exact same
 * rules run in the client provider ({@link useRbac}), in the menu resolver and
 * in server-side guards ({@link authorize}). Keeping this in one place means a
 * user can never be granted access on the server that the UI would deny, or
 * vice versa.
 */
import type { Permission } from "./types";
import { PERMISSION_WILDCARD } from "./permissions";

/** Does the granted set satisfy `required`, honouring `*:*` and `resource:*`? */
export function permissionMatches(
  granted: ReadonlySet<Permission>,
  required: Permission,
): boolean {
  if (granted.has(PERMISSION_WILDCARD)) return true;
  if (granted.has(required)) return true;
  const [resource] = required.split(":");
  return granted.has(`${resource}:*`);
}

export function can(
  granted: ReadonlySet<Permission>,
  required: Permission,
): boolean {
  return permissionMatches(granted, required);
}

/** True only if every listed permission is held. */
export function canAll(
  granted: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  return required.every((p) => permissionMatches(granted, p));
}

/** True if any listed permission is held (empty list ⇒ unrestricted). */
export function canAny(
  granted: ReadonlySet<Permission>,
  required: readonly Permission[],
): boolean {
  return required.length === 0 || required.some((p) => permissionMatches(granted, p));
}
