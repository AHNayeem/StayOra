import type { AuthUser } from "@/types/account";
import { homeRouteForRole } from "@/constants/accounts";

/** Routes that require a dashboard-capable session (see `AuthUser.dashboardRole`). */
const DASHBOARD_ROOT = "/dashboard";

/** Guest-only routes — redirecting an authenticated user here would bounce forever. */
const GUEST_ROUTES = ["/login", "/register", "/forgot-password"];

/**
 * True for a same-origin absolute path. Protocol-relative (`//evil.com`) and
 * absolute URLs are rejected, so a crafted `?next=` can't redirect off-site.
 */
export function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function matchesRoute(path: string, route: string): boolean {
  const clean = path.split(/[?#]/)[0];
  return clean === route || clean.startsWith(`${route}/`);
}

/**
 * Decide where a signed-in user actually goes after authentication.
 *
 * A `?next=` param is a *request*, not a guarantee: the guard that set it only
 * knew the visitor was unauthenticated, not who they'd turn out to be. A
 * traveler who signs in on `/login?next=/dashboard` must not be sent to
 * `/dashboard` — the server layout has no dashboard session for them and would
 * redirect straight back to `/login?next=/dashboard`, ping-ponging forever. So
 * we drop any destination the user can't reach (and any off-site or guest-only
 * one) and fall back to their role's home route.
 */
export function resolvePostAuthRedirect(
  next: string | null | undefined,
  user: AuthUser | null | undefined,
): string {
  const fallback = user ? homeRouteForRole(user.role) : "/";
  if (!next || !isInternalPath(next)) return fallback;
  // Never land back on a guest-only page.
  if (GUEST_ROUTES.some((route) => matchesRoute(next, route))) return fallback;
  // Dashboard routes need an RBAC role; travelers have none.
  if (matchesRoute(next, DASHBOARD_ROOT) && !user?.dashboardRole) return fallback;
  return next;
}
