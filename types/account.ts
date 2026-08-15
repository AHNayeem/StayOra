/**
 * Public account (traveler / merchant) domain types.
 *
 * Distinct from the dashboard's server-side RBAC principal
 * ({@link import("@/features/dashboard/rbac/types").CurrentUser}): this is the
 * client-persisted identity of a visitor who signs in on the public site. The
 * two converge once a real backend issues one session for both surfaces — which
 * is why an account can now carry the dashboard role it maps to.
 */

import type {
  MerchantStaffRoleId,
  RoleId as DashboardRoleId,
} from "@/features/dashboard/rbac/types";

export type { DashboardRoleId };

/**
 * Coarse role that drives post-login routing and dashboard access.
 * `agency` is the B2B partner (travel agency / corporate travel manager);
 * `staff` covers internal operators (support, finance, marketing…) whose exact
 * privileges come from {@link AuthUser.dashboardRole}.
 */
export type AccountRole = "traveler" | "merchant" | "admin" | "agency" | "staff";

/** Loyalty tiers surfaced in the traveler rewards area. */
export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

/** A signed-in user as the client session knows them. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: AccountRole;
  /**
   * Fine-grained dashboard role (RBAC). Absent for travelers, who have no
   * dashboard access. Kept as the RBAC `RoleId` so one sign-in drives both the
   * public site and the dashboard's permission model.
   */
  dashboardRole?: DashboardRoleId;
  /** Merchant this user works for — scopes every merchant-facing query. */
  merchantId?: string;
  /**
   * Their job inside that merchant account (owner, manager, front desk…).
   * Narrows the merchant role's grants — see `rbac/current-user`.
   */
  merchantRole?: MerchantStaffRoleId;
  /** B2B account this user books for — scopes agency queries. */
  organizationId?: string;
  phone?: string;
  /** ISO 3166-1 alpha-2 country code. */
  country?: string;
  emailVerified: boolean;
  /** Whether the profile has the required details filled in. */
  profileComplete: boolean;
  loyaltyTier: LoyaltyTier;
  /** Reward points balance. */
  points: number;
  /** ISO creation date. */
  createdAt: string;
}

/** Credentials for {@link AuthService.login}. */
export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

/** Payload for {@link AuthService.register}. */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: AccountRole;
}

/** A resolved client session. `token` mirrors a future bearer token. */
export interface AuthSession {
  user: AuthUser;
  token: string;
  /** Epoch ms expiry. */
  expiresAt: number;
}
