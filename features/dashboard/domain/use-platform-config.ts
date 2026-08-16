"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_PLATFORM_CONFIG,
  configRevision,
  platformConfig,
  subscribeConfig,
  type PlatformConfig,
} from "./platform-config";

/**
 * The live platform configuration.
 *
 * The server snapshot is deliberately the shipped defaults: the config is
 * client-persisted, so SSR must render what every visitor would see and let the
 * client re-derive after hydration. Same trick the role registry uses.
 */
export function usePlatformConfig(): PlatformConfig {
  const revision = useSyncExternalStore(subscribeConfig, configRevision, () => -1);
  return revision === -1 ? DEFAULT_PLATFORM_CONFIG : platformConfig();
}

/** Just the maintenance section — the guard components only need this. */
export function useMaintenance(): PlatformConfig["maintenance"] {
  return usePlatformConfig().maintenance;
}
