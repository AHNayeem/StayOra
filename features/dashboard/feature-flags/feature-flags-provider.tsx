"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { FeatureFlagKey } from "./flags";

interface FeatureFlagsValue {
  isEnabled: (flag: FeatureFlagKey) => boolean;
  /** All enabled flag keys, for debugging / admin surfaces. */
  enabled: FeatureFlagKey[];
}

const FeatureFlagsContext = createContext<FeatureFlagsValue | null>(null);

/**
 * Publishes the set of enabled feature flags to the dashboard subtree. Seeded on
 * the server from the resolved session and injected once by the shell, so every
 * flag check reads from a single source.
 */
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlagKey[];
  children: ReactNode;
}) {
  const value = useMemo<FeatureFlagsValue>(() => {
    const set = new Set(flags);
    return {
      isEnabled: (flag) => set.has(flag),
      enabled: flags,
    };
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

function useFeatureFlagsContext(): FeatureFlagsValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error(
      "useFeatureFlag(s) must be used within a <FeatureFlagsProvider>.",
    );
  }
  return ctx;
}

/** Read all enabled flags plus the `isEnabled` checker. */
export function useFeatureFlags(): FeatureFlagsValue {
  return useFeatureFlagsContext();
}

/** True if a single flag is enabled. */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  return useFeatureFlagsContext().isEnabled(flag);
}

/**
 * Declarative flag gate. Renders `children` only when `flag` is enabled,
 * otherwise `fallback` (default: nothing). Mirrors `<Can>` for permissions.
 */
export function Feature({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlagKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{useFeatureFlag(flag) ? children : fallback}</>;
}
