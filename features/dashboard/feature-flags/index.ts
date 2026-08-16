/** Feature-flags barrel. */
export {
  KNOWN_FEATURE_FLAGS,
  DEFAULT_ENABLED_FLAGS,
  getFeatureFlags,
} from "./flags";
export type { FeatureFlagKey } from "./flags";
export {
  FEATURE_FLAG_CATALOGUE,
  FEATURE_FLAG_KEYS,
  flagDefinition,
} from "./flag-catalogue";
export type { FeatureFlagDefinition } from "./flag-catalogue";
export {
  listFlagRecords,
  flagAppliesTo,
  resolveEnabledFlags,
  setFlagEnabled,
  setFlagRoles,
  resetFlag,
  resetAllFlags,
  subscribeFlags,
  getFlagsRevision,
} from "./flag-store";
export type { FeatureFlagRecord } from "./flag-store";
export {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeatureFlag,
  Feature,
} from "./feature-flags-provider";
