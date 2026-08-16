/**
 * Built-in role catalogue — the roles that ship with the product.
 *
 * Extracted from `roles.ts` so the runtime registry (`role-registry.ts`) can
 * read the shipped seed without importing the module that consults it. These
 * definitions are immutable: an admin may *override* a built-in role's grants at
 * runtime, but the original stays here so "reset to default" is always possible.
 *
 * A real deployment replaces this map with a fetched payload; the registry
 * layered on top keeps the same shape either way.
 */

import type { Permission, Role, RoleId } from "./types";
import { PERMISSION_WILDCARD, RESOURCES } from "./permissions";

/** All read permissions across every resource — a common building block. */
const READ_ALL: Permission[] = RESOURCES.map((r) => `${r}:read`);

/**
 * Role → permission seed.
 *
 * Wildcards (`resource:*`, `*:*`) are expanded at login by
 * {@link import("./roles").expandPermissions}, so guards only ever compare
 * concrete strings.
 */
export const BUILT_IN_ROLES: Record<string, Role> = {
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
      "flights:*",
      "customers:*",
      "finance:*",
      "b2b:*",
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
      "flights:read",
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
    /**
     * Merchants own their inventory, pricing, promotions and booking operations,
     * and can *see* their money — but refund decisions, commission rules and
     * settlement runs stay with the platform, so no `finance:update`,
     * `finance:approve`, `merchants:*` or `settings:*` here.
     */
    permissions: [
      "dashboard:read",
      "analytics:read",
      "bookings:read",
      "bookings:update",
      "catalog:*",
      "finance:read",
      "finance:export",
      "promotions:read",
      "promotions:create",
      "promotions:update",
      "promotions:delete",
      "reviews:read",
      "reviews:update",
      "customers:read",
      "reports:read",
      "reports:export",
      "support:read",
      "support:create",
      "notifications:read",
      "profile:*",
    ],
  },
  agency: {
    id: "agency",
    label: "Agency / Corporate",
    description:
      "B2B partner: books platform inventory at net rates against a credit account.",
    permissions: [
      "dashboard:read",
      "b2b:read",
      "b2b:create",
      "bookings:read",
      "bookings:create",
      "bookings:update",
      "finance:read",
      "reports:read",
      "notifications:read",
      "support:read",
      "support:create",
      "profile:*",
    ],
  },
  /**
   * A named booker inside an agency.
   *
   * `B2BSubUser` has always existed as data; this is the role that lets one sign
   * in. Deliberately *less* than `agency`: a sub-user books against the account
   * but never sees the credit line, statements or consolidated invoices, which
   * is the whole reason the account owner is a separate role.
   */
  b2b_agent: {
    id: "b2b_agent",
    label: "B2B Agent",
    description:
      "Sub-user of an agency: books against the account without seeing its finances.",
    permissions: [
      "dashboard:read",
      "b2b:read",
      "bookings:read",
      "bookings:create",
      "bookings:update",
      "reports:read",
      "notifications:read",
      "support:read",
      "support:create",
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
      "flights:read",
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
      "b2b:read",
      "profile:*",
    ],
  },
  /**
   * Merchant verification has an owner at last.
   *
   * Approving an onboarding application is a control function, not a commercial
   * one: compliance may decide who trades on the platform and read the evidence
   * behind that decision, but holds nothing financial and cannot touch catalog,
   * pricing or settings.
   */
  compliance: {
    id: "compliance",
    label: "Compliance / KYC",
    description:
      "Reviews merchant onboarding, documents and verification; approves or rejects applications.",
    permissions: [
      "dashboard:read",
      "merchants:read",
      "merchants:update",
      "merchants:approve",
      "b2b:read",
      "customers:read",
      "catalog:read",
      "reports:read",
      "reports:export",
      "notifications:read",
      "logs:read",
      "support:read",
      "profile:*",
    ],
  },
  /**
   * Internal and external audit. Sees everything, changes nothing — the one
   * role whose grant list is derived rather than written, so a new resource is
   * visible to audit the day it ships.
   */
  auditor: {
    id: "auditor",
    label: "Auditor",
    description: "Read-only visibility across every module, with no write access.",
    permissions: [...READ_ALL, "reports:export", "finance:export", "profile:*"],
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

/** Ids of the roles that ship with the product, in display order. */
export const BUILT_IN_ROLE_IDS: RoleId[] = Object.keys(BUILT_IN_ROLES);

/** All read permissions — exported for callers assembling custom roles. */
export const readAllPermissions = (): Permission[] => [...READ_ALL];
