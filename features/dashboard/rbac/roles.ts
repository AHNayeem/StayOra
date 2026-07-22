import type { Permission, Role, RoleId } from "./types";
import { PERMISSION_WILDCARD, RESOURCES } from "./permissions";

/** All read permissions across every resource — a common building block. */
const READ_ALL: Permission[] = RESOURCES.map((r) => `${r}:read`);

/**
 * Role → permission seed.
 *
 * Placeholder for the Phase 3 API. Wildcards (`resource:*`, `*:*`) are expanded
 * at login by {@link expandPermissions}, so guards only ever compare concrete
 * strings. Real deployments will replace this map with a fetched payload.
 */
export const ROLES: Record<RoleId, Role> = {
  super_admin: {
    id: "super_admin",
    label: "Super Admin",
    description: "Unrestricted access to every module and action.",
    permissions: [PERMISSION_WILDCARD],
  },
  admin: {
    id: "admin",
    label: "Admin",
    description: "Manages the platform except destructive system operations.",
    permissions: [
      "dashboard:*",
      "analytics:*",
      "bookings:*",
      "merchants:*",
      "catalog:*",
      "customers:*",
      "finance:*",
      "promotions:*",
      "reviews:*",
      "cms:*",
      "localization:*",
      "reports:*",
      "notifications:*",
      "users:*",
      "roles:read",
      "permissions:read",
      "settings:*",
      "support:*",
      "logs:read",
      "profile:*",
    ],
  },
  staff: {
    id: "staff",
    label: "Staff",
    description: "Day-to-day operations across bookings and customers.",
    permissions: [
      "dashboard:read",
      "bookings:read",
      "bookings:update",
      "customers:read",
      "reviews:read",
      "notifications:read",
      "profile:*",
    ],
  },
  merchant: {
    id: "merchant",
    label: "Merchant",
    description: "Scoped to their own organization's catalog and bookings.",
    permissions: [
      "dashboard:read",
      "analytics:read",
      "bookings:read",
      "bookings:update",
      "catalog:*",
      "finance:read",
      "promotions:read",
      "reviews:read",
      "notifications:read",
      "profile:*",
    ],
  },
  vendor: {
    id: "vendor",
    label: "Vendor",
    description: "Supplies inventory; limited catalog and booking visibility.",
    permissions: [
      "dashboard:read",
      "catalog:read",
      "catalog:update",
      "bookings:read",
      "profile:*",
    ],
  },
  support: {
    id: "support",
    label: "Customer Support",
    description: "Handles tickets, bookings and customer records.",
    permissions: [
      "dashboard:read",
      "bookings:read",
      "bookings:update",
      "customers:read",
      "support:*",
      "reviews:read",
      "notifications:read",
      "profile:*",
    ],
  },
  finance: {
    id: "finance",
    label: "Finance",
    description: "Owns payments, payouts, invoices and reconciliation.",
    permissions: [
      "dashboard:read",
      "finance:*",
      "reports:read",
      "reports:export",
      "bookings:read",
      "merchants:read",
      "profile:*",
    ],
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    description: "Runs promotions, campaigns and content marketing.",
    permissions: [
      "dashboard:read",
      "analytics:read",
      "promotions:*",
      "cms:*",
      "reviews:read",
      "reports:read",
      "profile:*",
    ],
  },
  content_manager: {
    id: "content_manager",
    label: "Content Manager",
    description: "Manages CMS, localization and reviews moderation.",
    permissions: [
      "dashboard:read",
      "cms:*",
      "localization:*",
      "reviews:*",
      "profile:*",
    ],
  },
};

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

/** All selectable roles, in display order — for future role management UI. */
export const ROLE_LIST: Role[] = Object.values(ROLES);

/** Look up a role, falling back to the least-privileged known role. */
export function getRole(id: RoleId): Role {
  return ROLES[id] ?? ROLES.vendor;
}

/** Referenced so `READ_ALL` is available to callers assembling custom roles. */
export const readAllPermissions = (): Permission[] => [...READ_ALL];
