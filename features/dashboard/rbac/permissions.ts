/**
 * Permission catalogue — the canonical list of `resource:action` strings the
 * dashboard understands. Kept in one place so menu configs, guards and (later)
 * the API seed reference the same source of truth instead of loose literals.
 *
 * This is the *shape* only; which permissions a user holds is decided by their
 * role (see {@link roles}) and, ultimately, the backend.
 */

export const RESOURCES = [
  "dashboard",
  "analytics",
  "bookings",
  "merchants",
  "catalog",
  "customers",
  "finance",
  "promotions",
  "reviews",
  "cms",
  "localization",
  "reports",
  "notifications",
  "users",
  "roles",
  "permissions",
  "system",
  "settings",
  "support",
  "logs",
  "profile",
] as const;

export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "approve",
  "export",
  "impersonate",
] as const;

export type Action = (typeof ACTIONS)[number];

/** Build a well-formed permission string. */
export function perm(resource: Resource, action: Action): string {
  return `${resource}:${action}`;
}

/** Grants every permission — used by super admin. */
export const PERMISSION_WILDCARD = "*:*";
