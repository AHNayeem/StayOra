import type { CurrentUser } from "../rbac/types";

export type AuthStatus = "authenticated" | "unauthenticated";

/**
 * The authenticated session. Owns the principal and the credentials the data
 * layer needs; RBAC and feature flags derive from `user`. Resolved on the
 * server and streamed to the client provider.
 */
export interface Session {
  user: CurrentUser;
  status: AuthStatus;
  /** Bearer token for API calls; `null` in the Phase 3 stub. */
  token: string | null;
  /** Epoch ms expiry, when known. */
  expiresAt: number | null;
}
