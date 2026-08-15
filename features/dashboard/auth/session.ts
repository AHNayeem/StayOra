import { cache } from "react";
import { cookies } from "next/headers";
import { resolveCurrentUser } from "../rbac/current-user";
import { assertPermission, assertAnyPermission } from "../rbac/authorize";
import type { Permission } from "../rbac/types";
import {
  DASHBOARD_SESSION_COOKIE,
  decodeSessionCookie,
} from "./session-cookie";
import type { Session } from "./types";

/**
 * Resolve the current session on the server.
 *
 * Reads the session cookie the client writes on sign-in (see
 * {@link import("./session-cookie")}), then derives the RBAC principal from the
 * *role* — permissions are never taken from the cookie. Returns `null` when
 * there's no valid session so the layout can redirect instead of rendering
 * privileged chrome. Wrapped in `React.cache` so repeated calls inside one
 * request are free.
 *
 * Swap the cookie read for a JWT verification / profile fetch and every caller —
 * layout, Server Actions, route handlers — keeps working unchanged.
 */
export const getServerSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const payload = decodeSessionCookie(store.get(DASHBOARD_SESSION_COOKIE)?.value);
  if (!payload) return null;

  const user = resolveCurrentUser({
    id: payload.id,
    name: payload.name,
    email: payload.email,
    roleId: payload.role,
    merchantId: payload.merchantId,
    merchantRole: payload.merchantRole,
    organizationId: payload.organizationId,
  });

  return {
    user,
    status: "authenticated",
    token: null,
    expiresAt: payload.exp ?? null,
  };
});

/** The signed-in principal, or `null` when unauthenticated. */
export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.status === "authenticated" ? session.user : null;
}

/**
 * Server guard: resolve the session and assert a permission in one call. Throws
 * a normalized `unauthorized`/`forbidden` {@link import("../data/errors").ApiError}.
 */
export async function requirePermission(permission: Permission) {
  return assertPermission(await getCurrentUser(), permission);
}

/** Server guard for "any of these permissions". */
export async function requireAnyPermission(permissions: readonly Permission[]) {
  return assertAnyPermission(await getCurrentUser(), permissions);
}
