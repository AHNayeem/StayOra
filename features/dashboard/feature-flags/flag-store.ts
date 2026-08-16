/**
 * Runtime feature-flag state.
 *
 * The catalogue says which flags exist; this says which are *on*, and for whom.
 * Two dimensions, because they answer different questions:
 *
 *   - `enabled` — is the capability switched on for this workspace at all?
 *   - `roles`   — which roles it exists for (empty ⇒ every role). This is the
 *     "role + feature" combination: a flag can be on and still not apply to you.
 *
 * Persisted per browser like the domain store, and falling back to the shipped
 * defaults on the server so SSR is deterministic. `resolveEnabledFlags(roleId)`
 * is the one function every consumer goes through.
 */

import { FEATURE_FLAG_CATALOGUE, type FeatureFlagDefinition } from "./flag-catalogue";
import type { RoleId } from "../rbac/types";

const STORAGE_KEY = "otithee:feature-flags:v1";
const EVENT = "otithee:feature-flags:change";

/** The mutable half of a flag. */
export interface FlagState {
  enabled: boolean;
  /** Roles the flag applies to. Empty ⇒ every role. */
  roles: RoleId[];
  updatedAt?: string;
  updatedBy?: string;
}

/** A flag as the admin screen shows it: definition + current state. */
export interface FeatureFlagRecord extends FeatureFlagDefinition {
  enabled: boolean;
  roles: RoleId[];
  /** True when the current state differs from what shipped. */
  modified: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

type Overrides = Record<string, FlagState>;

let overrides: Overrides | null = null;
let revision = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): Overrides {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Overrides;
      // Persisted overrides mean this browser already differs from the server —
      // leave revision 0 behind so subscribers re-resolve after hydration.
      if (Object.keys(parsed).length > 0) revision = Math.max(revision, 1);
      return parsed;
    }
  } catch {
    /* corrupt payload — fall back to the shipped defaults */
  }
  return {};
}

function getOverrides(): Overrides {
  overrides ??= load();
  return overrides;
}

function commit<T>(mutator: (draft: Overrides) => T): T {
  const draft = getOverrides();
  const result = mutator(draft);
  revision += 1;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* quota or private mode — changes just won't survive the reload */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return result;
}

export function getFlagsRevision(): number {
  // Load on first read so flags stored by an earlier session take effect
  // immediately rather than after the first toggle in this tab.
  getOverrides();
  return revision;
}

/** Server snapshot: always 0, so hydration starts from the shipped defaults. */
export function getServerFlagsRevision(): number {
  return 0;
}

export function subscribeFlags(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function stateFor(def: FeatureFlagDefinition): FlagState {
  const override = getOverrides()[def.key];
  return {
    enabled: override?.enabled ?? def.defaultEnabled,
    roles: override?.roles ?? def.defaultRoles ?? [],
    updatedAt: override?.updatedAt,
    updatedBy: override?.updatedBy,
  };
}

/** Every flag with its current state, for the admin screen. */
export function listFlagRecords(): FeatureFlagRecord[] {
  return FEATURE_FLAG_CATALOGUE.map((def) => {
    const state = stateFor(def);
    const shippedRoles = def.defaultRoles ?? [];
    return {
      ...def,
      ...state,
      modified:
        state.enabled !== def.defaultEnabled ||
        state.roles.join("|") !== shippedRoles.join("|"),
    };
  });
}

/** Does `flag` apply to a principal holding `roleId`? */
export function flagAppliesTo(key: string, roleId: RoleId): boolean {
  const def = FEATURE_FLAG_CATALOGUE.find((f) => f.key === key);
  if (!def) return false;
  const state = stateFor(def);
  if (!state.enabled) return false;
  return state.roles.length === 0 || state.roles.includes(roleId);
}

/**
 * The flags a principal actually holds. This is what the session carries and
 * what `hasFeature()` answers from.
 */
export function resolveEnabledFlags(roleId: RoleId): string[] {
  return FEATURE_FLAG_CATALOGUE.filter((def) => flagAppliesTo(def.key, roleId)).map(
    (def) => def.key,
  );
}

export function setFlagEnabled(key: string, enabled: boolean, actor?: string): void {
  commit((draft) => {
    const def = FEATURE_FLAG_CATALOGUE.find((f) => f.key === key);
    draft[key] = {
      enabled,
      roles: draft[key]?.roles ?? def?.defaultRoles ?? [],
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
  });
}

/** Limit a flag to specific roles. An empty list means "every role". */
export function setFlagRoles(key: string, roles: RoleId[], actor?: string): void {
  commit((draft) => {
    const def = FEATURE_FLAG_CATALOGUE.find((f) => f.key === key);
    draft[key] = {
      enabled: draft[key]?.enabled ?? def?.defaultEnabled ?? true,
      roles: [...roles],
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
  });
}

/** Restore one flag to what shipped. */
export function resetFlag(key: string): void {
  commit((draft) => {
    delete draft[key];
  });
}

/** Restore every flag — used by "reset demo data". */
export function resetAllFlags(): void {
  commit((draft) => {
    for (const key of Object.keys(draft)) delete draft[key];
  });
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
