/**
 * Dashboard session cookie.
 *
 * The public site signs users in client-side (localStorage, see
 * `@/services/auth`), but the dashboard layout is a Server Component that must
 * know the principal *before* rendering — otherwise a merchant could see admin
 * chrome for one frame, and the server couldn't enforce anything. So the auth
 * service also mirrors the session into a cookie: the client writes it on
 * sign-in, the server reads it in the layout.
 *
 * This is a prototype mechanism and is deliberately readable: it carries no
 * secret and grants nothing on its own. A real deployment replaces it with a
 * signed, `httpOnly` session cookie issued by the backend — every consumer of
 * {@link decodeSessionCookie} keeps working.
 */

import type { MerchantStaffRoleId, RoleId } from "../rbac/types";

export const DASHBOARD_SESSION_COOKIE = "otithee_session";

/** Days the mirrored cookie lives for. Matches the client session TTL. */
const MAX_AGE_DAYS = 7;

/** The principal, as carried between client sign-in and server render. */
export interface SessionCookiePayload {
  id: string;
  name: string;
  email: string;
  /** Fine-grained dashboard role driving RBAC. */
  role: RoleId;
  /** Merchant the user belongs to (merchant/vendor roles). */
  merchantId?: string;
  /** The user's job inside that merchant account — narrows their grants. */
  merchantRole?: MerchantStaffRoleId;
  /** B2B account the user belongs to (agency/corporate roles). */
  organizationId?: string;
  /** Coarse account role from the public session, for post-login routing. */
  accountRole?: string;
  /** Epoch ms expiry. */
  exp: number;
}

export function encodeSessionCookie(payload: SessionCookiePayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

/** Parse a cookie value. Returns `null` for anything malformed or expired. */
export function decodeSessionCookie(
  value: string | undefined | null,
): SessionCookiePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as SessionCookiePayload;
    if (!parsed?.id || !parsed?.role) return null;
    if (typeof parsed.exp === "number" && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Write the cookie from the browser (called by the auth service on sign-in). */
export function writeSessionCookie(
  payload: Omit<SessionCookiePayload, "exp"> & { exp?: number },
): void {
  if (typeof document === "undefined") return;
  const exp = payload.exp ?? Date.now() + MAX_AGE_DAYS * 86_400_000;
  const value = encodeSessionCookie({ ...payload, exp });
  const maxAge = Math.max(0, Math.floor((exp - Date.now()) / 1000));
  document.cookie = `${DASHBOARD_SESSION_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Clear the cookie from the browser (sign-out). */
export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DASHBOARD_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Read the cookie from the browser — used by the "view as" role switcher. */
export function readSessionCookie(): SessionCookiePayload | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${DASHBOARD_SESSION_COOKIE}=`));
  return decodeSessionCookie(match?.slice(DASHBOARD_SESSION_COOKIE.length + 1));
}
