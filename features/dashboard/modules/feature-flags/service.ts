/**
 * Feature-flag administration API.
 *
 * Thin async wrappers over the flag store, so the admin screen is written
 * against the shape a config service will expose. Every change is written to the
 * audit trail: turning a module off for a whole workspace is exactly the kind of
 * change someone needs to find afterwards.
 */

import { recordAudit } from "../../domain/service-kit";
import type { DomainActor } from "../../domain/types";
import {
  listFlagRecords,
  resetAllFlags,
  resetFlag,
  setFlagEnabled,
  setFlagRoles,
  type FeatureFlagRecord,
} from "../../feature-flags/flag-store";
import { flagDefinition } from "../../feature-flags/flag-catalogue";
import { getRole } from "../../rbac/roles";
import type { RoleId } from "../../rbac/types";

const LATENCY = 200;

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function auditFlag(
  actor: DomainActor,
  key: string,
  summary: string,
  from?: string,
  to?: string,
): void {
  recordAudit({
    actor,
    action: "update",
    entity: "feature_flag",
    entityId: key,
    entityLabel: flagDefinition(key)?.label ?? key,
    summary,
    from,
    to,
  });
}

export const featureFlagService = {
  async list(): Promise<FeatureFlagRecord[]> {
    return delay(listFlagRecords());
  },

  async setEnabled(
    key: string,
    enabled: boolean,
    actor: DomainActor,
  ): Promise<FeatureFlagRecord[]> {
    setFlagEnabled(key, enabled, actor.name);
    auditFlag(
      actor,
      key,
      `${enabled ? "Enabled" : "Disabled"} the ${flagDefinition(key)?.label ?? key} feature`,
      enabled ? "disabled" : "enabled",
      enabled ? "enabled" : "disabled",
    );
    return delay(listFlagRecords(), 120);
  },

  /** Limit a flag to specific roles. An empty list means every role. */
  async setRoles(
    key: string,
    roles: RoleId[],
    actor: DomainActor,
  ): Promise<FeatureFlagRecord[]> {
    setFlagRoles(key, roles, actor.name);
    auditFlag(
      actor,
      key,
      roles.length === 0
        ? `Made ${flagDefinition(key)?.label ?? key} available to every role`
        : `Limited ${flagDefinition(key)?.label ?? key} to ${roles
            .map((r) => getRole(r).label)
            .join(", ")}`,
    );
    return delay(listFlagRecords(), 120);
  },

  async reset(key: string, actor: DomainActor): Promise<FeatureFlagRecord[]> {
    resetFlag(key);
    auditFlag(actor, key, `Reset ${flagDefinition(key)?.label ?? key} to its shipped state`);
    return delay(listFlagRecords(), 120);
  },

  async resetAll(actor: DomainActor): Promise<FeatureFlagRecord[]> {
    resetAllFlags();
    recordAudit({
      actor,
      action: "update",
      entity: "feature_flag",
      entityId: "*",
      entityLabel: "All feature flags",
      summary: "Reset every feature flag to its shipped state",
    });
    return delay(listFlagRecords(), 120);
  },
};

export const featureFlagKeys = {
  all: ["feature-flags"] as const,
  list: () => ["feature-flags", "list"] as const,
};
