/**
 * Public auth barrel — the client session for travelers/merchants signing in on
 * the public site. (The dashboard's server-side RBAC session lives separately
 * in {@link "@/features/dashboard/auth"}.)
 */
export { useAuth, type AuthStatus, type UseAuthResult } from "./use-auth";
export { useSessionSnapshot, syncSession } from "./session-store";
export {
  useRedirectIfAuthenticated,
  useRequireAuth,
  type RequireAuthOptions,
  type RequireAuthResult,
} from "./guards";
