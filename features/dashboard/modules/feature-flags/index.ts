/** Feature-flags module — workspace switchboard for module-level gating. */
export { FeatureFlagsAdmin } from "./flags-view";
export { featureFlagService, featureFlagKeys } from "./service";
export {
  useFeatureFlagRecords,
  useSetFlagEnabled,
  useSetFlagRoles,
  useResetFlag,
  useResetAllFlags,
} from "./hooks";
