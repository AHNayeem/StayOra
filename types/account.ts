/**
 * Public account (traveler / merchant) domain types.
 *
 * Distinct from the dashboard's server-side RBAC principal
 * ({@link import("@/features/dashboard/rbac/types").CurrentUser}): this is the
 * client-persisted identity of a visitor who signs in on the public site. The
 * two converge once a real backend issues one session for both surfaces.
 */

/** Coarse role that drives post-login routing and dashboard access. */
export type AccountRole = "traveler" | "merchant" | "admin";

/** Loyalty tiers surfaced in the traveler rewards area. */
export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

/** A signed-in user as the client session knows them. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: AccountRole;
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
