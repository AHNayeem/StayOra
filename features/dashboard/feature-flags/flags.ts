/**
 * Feature-flag source.
 *
 * Flags gate whole modules independently of permissions (a user may be
 * permitted to see Analytics, but the Analytics *module* can still be dark for
 * their tenant). The catalogue below documents the flags the shell references;
 * which are enabled is data, resolved per user/tenant by {@link getFeatureFlags}
 * — a Phase 3 stub that Phase 3+ swaps for an API/config-service call. Nothing
 * is hardcoded in components; they read flags through {@link useFeatureFlag}.
 */

/** Known flag keys — reference list for admin UI and type hints. */
export const KNOWN_FEATURE_FLAGS = [
  "analytics",
  "command-palette",
  "org-switcher",
  "merchant-switcher",
  "messages",
] as const;

/** A flag key. Kept open (string) so tenants can define their own. */
export type FeatureFlagKey = (typeof KNOWN_FEATURE_FLAGS)[number] | (string & {});

/**
 * Flags enabled by default while there's no backend. This is the single source
 * for the demo principal too — `resolveCurrentUser` reads it — so the shell and
 * the flag provider never drift apart.
 */
export const DEFAULT_ENABLED_FLAGS: FeatureFlagKey[] = [
  "analytics",
  "command-palette",
  "org-switcher",
  "merchant-switcher",
  "messages",
];

/**
 * Resolve enabled flags for the current user/tenant. Async so the swap to a
 * config service is a body-only change. Accepts an optional seed (e.g. the
 * session's flags) and returns it verbatim today.
 */
export async function getFeatureFlags(
  seed: FeatureFlagKey[] = DEFAULT_ENABLED_FLAGS,
): Promise<FeatureFlagKey[]> {
  return seed;
}
