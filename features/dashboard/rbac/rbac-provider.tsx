"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  CurrentUser,
  FeatureFlag,
  Permission,
  RbacContextValue,
  RoleId,
} from "./types";
import { canAll as canAllSet, canAny as canAnySet, permissionMatches } from "./access";

const RbacContext = createContext<RbacContextValue | null>(null);

interface RbacProviderProps {
  user: CurrentUser;
  children: ReactNode;
}

/**
 * Provides the authenticated principal and derived access checks to the whole
 * dashboard subtree. Everything permission-aware (menu, guards, actions) reads
 * from here, so swapping the Phase 1 stub user for a real session in Phase 3
 * touches nothing downstream.
 */
export function RbacProvider({ user, children }: RbacProviderProps) {
  const value = useMemo<RbacContextValue>(() => {
    const granted = new Set(user.permissions);
    const flags = new Set(user.featureFlags);
    return {
      user,
      can: (permission: Permission) => permissionMatches(granted, permission),
      canAll: (permissions: Permission[]) => canAllSet(granted, permissions),
      canAny: (permissions: Permission[]) => canAnySet(granted, permissions),
      hasFeature: (flag: FeatureFlag) => flags.has(flag),
      hasRole: (role: RoleId) => user.roleId === role,
    };
  }, [user]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}

/** Access the RBAC context. Throws if used outside {@link RbacProvider}. */
export function useRbac(): RbacContextValue {
  const ctx = useContext(RbacContext);
  if (!ctx) {
    throw new Error("useRbac must be used within a <RbacProvider>.");
  }
  return ctx;
}
