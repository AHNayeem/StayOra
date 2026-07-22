/**
 * Platform service — the reference example of the services layer.
 *
 * Services are the ONLY thing UI/hooks call for data; they hide whether the
 * data comes from a stub, a repository or a direct fetch. This one reads the
 * cross-cutting configuration the shell needs (navigation menu, feature flags).
 * Bodies wrap Phase 3 stubs today; each becomes a repository/HTTP call once its
 * endpoint exists — callers and query keys never change.
 */
import { getDashboardMenu } from "../navigation/menu-config";
import type { MenuNode } from "../navigation/types";
import { getFeatureFlags, type FeatureFlagKey } from "../feature-flags/flags";

export const platformService = {
  /** Fetch the DB-driven navigation tree. */
  getMenu: (): Promise<MenuNode[]> => getDashboardMenu(),
  /** Fetch enabled feature flags for the current user/tenant. */
  getFeatureFlags: (seed?: FeatureFlagKey[]): Promise<FeatureFlagKey[]> =>
    getFeatureFlags(seed),
};

/**
 * Query-key factory for platform reads. Centralizing keys keeps `useQuery`
 * subscriptions and `invalidatePrefix` calls consistent and typo-proof.
 */
export const platformKeys = {
  all: ["platform"] as const,
  menu: () => ["platform", "menu"] as const,
  featureFlags: () => ["platform", "feature-flags"] as const,
};
