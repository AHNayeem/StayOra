/**
 * RBAC domain types.
 *
 * Phase 1 ships the *skeleton*: types, a permission catalogue, and a role→
 * permission seed that stand in for what will later be fetched from the API
 * (see Phase 3). Nothing here is hardcoded into UI — components read access
 * exclusively through {@link useRbac}.
 */

/** The roles that ship with the product. Mirrors `role-catalogue.ts`. */
export type BuiltInRoleId =
  | "super_admin"
  | "admin"
  | "staff"
  | "merchant"
  | "vendor"
  /** B2B: travel agency / corporate travel manager booking on credit. */
  | "agency"
  /** A named booker inside an agency — books, but sees none of its money. */
  | "b2b_agent"
  | "support"
  | "finance"
  /** Owns merchant verification: approves or rejects onboarding applications. */
  | "compliance"
  /** Read-only across every module, for internal and external audit. */
  | "auditor"
  | "marketing"
  | "content_manager";

/**
 * A role identifier.
 *
 * Open by design: roles can be created at runtime (see `role-registry.ts`), so
 * an id is any string. The union above is kept for autocomplete and for the
 * places that legitimately reason about a *specific* shipped role.
 */
export type RoleId = BuiltInRoleId | (string & {});

/**
 * A permission string in `resource:action` form (e.g. `bookings:read`).
 * `*` is a wildcard segment — `*:*` grants everything, `finance:*` grants
 * every action on the finance resource.
 */
export type Permission = string;

/** Feature-flag key. Flags gate modules independently of permissions. */
export type FeatureFlag = string;

/** A role definition as it would arrive from the API. */
export interface Role {
  id: RoleId;
  /** Human label (display only — real label comes from the API/i18n). */
  label: string;
  description: string;
  /** Permissions granted to the role. Supports `*` wildcards. */
  permissions: Permission[];
}

/** The authenticated principal driving every access decision in the shell. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  roleId: RoleId;
  /** Flattened, wildcard-expanded permission set for O(1) checks. */
  permissions: Permission[];
  /** Enabled feature flags for this user/tenant. */
  featureFlags: FeatureFlag[];
  /** Organization the user belongs to; merchants are scoped to their own. */
  organizationId: string;
  /**
   * Merchant this user works for. Present only for merchant/vendor principals;
   * every merchant-facing query is scoped by it (see `DomainScope`).
   */
  merchantId?: string;
  /**
   * The user's role *inside* that merchant account.
   *
   * Platform role says "this is a merchant principal"; this says which job they
   * do there. Grants are the intersection of the two, so a Front Desk account
   * can never reach payouts however the merchant role is defined.
   */
  merchantRole?: MerchantStaffRoleId;
}

/**
 * Merchant-side roles, mirrored from `domain/merchants`.
 *
 * Duplicated as a string union rather than imported so the RBAC layer stays
 * free of domain imports; {@link import("../domain/merchants").MERCHANT_ROLE_IDS}
 * is the source of truth and a mismatch fails to compile in `current-user.ts`.
 */
export type MerchantStaffRoleId =
  | "owner"
  | "manager"
  | "reservations"
  | "front_desk"
  | "revenue_manager"
  | "finance";

/** Shape exposed by the RBAC context. */
export interface RbacContextValue {
  user: CurrentUser;
  /** True if the user holds `permission` (respecting `*` wildcards). */
  can: (permission: Permission) => boolean;
  /** True if the user holds *every* listed permission. */
  canAll: (permissions: Permission[]) => boolean;
  /** True if the user holds *any* listed permission. */
  canAny: (permissions: Permission[]) => boolean;
  /** True if `flag` is enabled for this user/tenant. */
  hasFeature: (flag: FeatureFlag) => boolean;
  /** Convenience role check. */
  hasRole: (role: RoleId) => boolean;
}
