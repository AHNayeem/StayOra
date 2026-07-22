/**
 * RBAC domain types.
 *
 * Phase 1 ships the *skeleton*: types, a permission catalogue, and a role→
 * permission seed that stand in for what will later be fetched from the API
 * (see Phase 3). Nothing here is hardcoded into UI — components read access
 * exclusively through {@link useRbac}.
 */

/** Stable role identifiers. Mirrors the roles named in DashboardDesign.md. */
export type RoleId =
  | "super_admin"
  | "admin"
  | "staff"
  | "merchant"
  | "vendor"
  | "support"
  | "finance"
  | "marketing"
  | "content_manager";

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
}

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
