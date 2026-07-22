import type { CurrentUser, RoleId } from "./types";
import { expandPermissions, getRole } from "./roles";
import { DEFAULT_ENABLED_FLAGS } from "../feature-flags/flags";

/**
 * Resolve the current principal.
 *
 * Phase 1 stub: assembles a {@link CurrentUser} from a role seed so the shell
 * is fully driven by RBAC data end-to-end. Phase 3 replaces the body with a
 * session/API lookup — the signature and return shape stay the same.
 */
export function resolveCurrentUser(
  roleId: RoleId = "super_admin",
): CurrentUser {
  const role = getRole(roleId);
  return {
    id: "usr_demo",
    name: "Ava Rahman",
    email: "ava@stayora.app",
    roleId: role.id,
    permissions: expandPermissions(role.permissions),
    // Feature flags are fetched per tenant/user; seed from the shared default
    // set so the flag provider and this principal never drift apart.
    featureFlags: [...DEFAULT_ENABLED_FLAGS],
    organizationId: "org_stayora",
  };
}
