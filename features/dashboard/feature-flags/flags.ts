/**
 * Feature-flag source.
 *
 * Flags gate whole modules independently of permissions (a user may be
 * permitted to see Analytics, but the Analytics *module* can still be dark for
 * their tenant). `flag-catalogue.ts` documents every flag and what it gates;
 * `flag-store.ts` holds which are enabled and for which roles. This file is the
 * read API the shell and the services layer call — a Phase 3 stub that a config
 * service replaces without touching a component, since nothing is hardcoded in
 * components: they read flags through {@link useFeatureFlag}.
 */

import { FEATURE_FLAG_KEYS } from "./flag-catalogue";
import { resolveEnabledFlags } from "./flag-store";
import type { RoleId } from "../rbac/types";

/** Known flag keys — reference list for admin UI and type hints. */
export const KNOWN_FEATURE_FLAGS = FEATURE_FLAG_KEYS;

/** A flag key. Kept open (string) so tenants can define their own. */
export type FeatureFlagKey = string;

/**
 * Flags enabled by default while there's no backend — i.e. before any role
 * targeting is applied. Kept as the seed the principal falls back to.
 */
export const DEFAULT_ENABLED_FLAGS: FeatureFlagKey[] = resolveEnabledFlags("super_admin");

/**
 * Resolve enabled flags for a principal. Async so the swap to a config service
 * is a body-only change. Accepts a role id (preferred) or an explicit seed.
 */
export async function getFeatureFlags(
  roleOrSeed: RoleId | FeatureFlagKey[] = "super_admin",
): Promise<FeatureFlagKey[]> {
  if (Array.isArray(roleOrSeed)) return roleOrSeed;
  return resolveEnabledFlags(roleOrSeed);
}
