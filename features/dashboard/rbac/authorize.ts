/**
 * Server-side authorization guards.
 *
 * The client enforces access through {@link useRbac}; these mirror it for
 * Server Components, Server Actions and route handlers, using the *same*
 * {@link access} rules. They throw normalized {@link ApiError}s (`unauthorized`
 * when there's no principal, `forbidden` when the principal lacks the grant) so
 * callers can convert them to redirects, 401/403 responses or error boundaries.
 */
import { ApiError } from "../data/errors";
import type { CurrentUser, Permission } from "./types";
import { canAll, canAny, permissionMatches } from "./access";

function grantedSet(user: CurrentUser): ReadonlySet<Permission> {
  return new Set(user.permissions);
}

/** Non-throwing check for a single permission. */
export function userCan(user: CurrentUser | null, permission: Permission): boolean {
  return user ? permissionMatches(grantedSet(user), permission) : false;
}

/** Non-throwing check that the user holds every listed permission. */
export function userCanAll(
  user: CurrentUser | null,
  permissions: readonly Permission[],
): boolean {
  return user ? canAll(grantedSet(user), permissions) : false;
}

/** Non-throwing check that the user holds any listed permission. */
export function userCanAny(
  user: CurrentUser | null,
  permissions: readonly Permission[],
): boolean {
  return user ? canAny(grantedSet(user), permissions) : false;
}

/**
 * Assert the principal holds `permission`. Throws `unauthorized` if there's no
 * user, `forbidden` if the grant is missing. Returns the user for chaining.
 */
export function assertPermission(
  user: CurrentUser | null,
  permission: Permission,
): CurrentUser {
  if (!user) {
    throw new ApiError({ kind: "unauthorized", message: "Sign in required." });
  }
  if (!permissionMatches(grantedSet(user), permission)) {
    throw new ApiError({
      kind: "forbidden",
      message: `Missing permission: ${permission}`,
    });
  }
  return user;
}

/** Assert the principal holds *any* of the listed permissions. */
export function assertAnyPermission(
  user: CurrentUser | null,
  permissions: readonly Permission[],
): CurrentUser {
  if (!user) {
    throw new ApiError({ kind: "unauthorized", message: "Sign in required." });
  }
  if (!canAny(grantedSet(user), permissions)) {
    throw new ApiError({
      kind: "forbidden",
      message: `Missing one of: ${permissions.join(", ")}`,
    });
  }
  return user;
}
