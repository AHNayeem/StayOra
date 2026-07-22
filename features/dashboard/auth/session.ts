import { cache } from "react";
import { resolveCurrentUser } from "../rbac/current-user";
import { assertPermission, assertAnyPermission } from "../rbac/authorize";
import type { Permission } from "../rbac/types";
import type { Session } from "./types";

/**
 * Resolve the current session on the server.
 *
 * Phase 3 stub: there's no cookie/JWT yet, so it assembles the session from the
 * demo principal — but it's the single server entry point for "who is signed
 * in", wrapped in `React.cache` so repeated calls within one request are free.
 * Swap the body for a real lookup (e.g. read `cookies()`, verify a JWT, fetch
 * the profile) and every caller — layout, Server Actions, route handlers —
 * keeps working unchanged.
 */
export const getServerSession = cache(async (): Promise<Session> => {
  const user = resolveCurrentUser();
  return { user, status: "authenticated", token: null, expiresAt: null };
});

/** The signed-in principal, or `null` when unauthenticated. */
export async function getCurrentUser() {
  const session = await getServerSession();
  return session.status === "authenticated" ? session.user : null;
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
