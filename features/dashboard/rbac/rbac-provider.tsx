"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type {
  CurrentUser,
  FeatureFlag,
  Permission,
  RbacContextValue,
  RoleId,
} from "./types";
import { canAll as canAllSet, canAny as canAnySet, permissionMatches } from "./access";
import { derivePermissions } from "./current-user";
import {
  getRolesRevision,
  getServerRolesRevision,
  subscribeRoles,
} from "./role-registry";
import {
  getFlagsRevision,
  getServerFlagsRevision,
  resolveEnabledFlags,
  subscribeFlags,
} from "../feature-flags/flag-store";

const RbacContext = createContext<RbacContextValue | null>(null);

interface RbacProviderProps {
  user: CurrentUser;
  children: ReactNode;
}

/**
 * Provides the authenticated principal and derived access checks to the whole
 * dashboard subtree. Everything permission-aware (menu, guards, actions) reads
 * from here, so swapping the stub user for a real session touches nothing
 * downstream.
 *
 * The principal arrives resolved from the server, but roles and feature flags
 * can both be edited at runtime — so the provider subscribes to those registries
 * and re-derives grants when they change. `useSyncExternalStore` with a server
 * snapshot means hydration starts from exactly what the server rendered and only
 * then picks up local changes: no mismatch, no flash of the wrong sidebar.
 */
export function RbacProvider({ user, children }: RbacProviderProps) {
  const rolesRevision = useSyncExternalStore(
    subscribeRoles,
    getRolesRevision,
    getServerRolesRevision,
  );
  const flagsRevision = useSyncExternalStore(
    subscribeFlags,
    getFlagsRevision,
    getServerFlagsRevision,
  );

  const value = useMemo<RbacContextValue>(() => {
    // Revision 0 is the server's view — reuse the resolved principal verbatim.
    const permissions: Permission[] =
      rolesRevision === 0
        ? user.permissions
        : derivePermissions(user.roleId, user.merchantRole);
    const featureFlags: FeatureFlag[] =
      flagsRevision === 0 ? user.featureFlags : resolveEnabledFlags(user.roleId);

    const effective: CurrentUser = { ...user, permissions, featureFlags };
    const granted = new Set(permissions);
    const flags = new Set(featureFlags);

    return {
      user: effective,
      can: (permission: Permission) => permissionMatches(granted, permission),
      canAll: (permissions_: Permission[]) => canAllSet(granted, permissions_),
      canAny: (permissions_: Permission[]) => canAnySet(granted, permissions_),
      hasFeature: (flag: FeatureFlag) => flags.has(flag),
      hasRole: (role: RoleId) => user.roleId === role,
    };
  }, [user, rolesRevision, flagsRevision]);

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
