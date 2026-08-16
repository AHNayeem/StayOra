/**
 * The runtime role registry.
 *
 * Roles used to be a compile-time constant: changing who may do what needed a
 * deploy. The registry keeps the shipped catalogue as the floor and layers two
 * kinds of runtime change on top of it:
 *
 *   - **overrides** — a built-in role whose grants (or label) an admin edited,
 *     always reversible back to the shipped definition;
 *   - **custom roles** — entirely new roles, usually cloned from a built-in.
 *
 * Storage mirrors the domain store deliberately: persisted to `localStorage` in
 * the browser so a demo survives a reload, and falling back to the shipped
 * catalogue on the server so SSR stays deterministic. A role created in the
 * browser is therefore unknown to the server render — {@link getRoleRecord}
 * returns `undefined` there and the caller degrades to the least-privileged
 * role, which is the safe direction. The client re-resolves after hydration
 * (see `RbacProvider`).
 *
 * A real deployment replaces the body of each function with an API call; the
 * signatures in `role-service.ts` are already that contract.
 */

import { BUILT_IN_ROLES, BUILT_IN_ROLE_IDS } from "./role-catalogue";
import type { Permission, Role, RoleId } from "./types";

/** Bump when the persisted shape changes so stale state is discarded. */
const STORAGE_KEY = "otithee:rbac:roles:v1";
const EVENT = "otithee:rbac:roles:change";

/** A role as the registry knows it: definition plus provenance. */
export interface RoleRecord extends Role {
  /** True for roles that ship with the product. Built-ins can't be deleted. */
  builtIn: boolean;
  /** True when a built-in's grants or labelling have been edited at runtime. */
  modified: boolean;
  /** The role this one was cloned from, for custom roles. */
  basedOn?: RoleId;
  createdAt: string;
  updatedAt: string;
  /** Who last changed it — display only. */
  updatedBy?: string;
}

/** The mutable half: what an admin changed on top of the catalogue. */
interface RoleOverride {
  label?: string;
  description?: string;
  permissions?: Permission[];
  updatedAt: string;
  updatedBy?: string;
}

interface RegistryState {
  /** Runtime-created roles, keyed by id. */
  custom: Record<string, RoleRecord>;
  /** Edits applied to built-in roles, keyed by id. */
  overrides: Record<string, RoleOverride>;
}

function emptyState(): RegistryState {
  return { custom: {}, overrides: {} };
}

let state: RegistryState | null = null;
let revision = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function load(): RegistryState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<RegistryState>;
      const stored: RegistryState = {
        custom: parsed.custom ?? {},
        overrides: parsed.overrides ?? {},
      };
      // Anything persisted means this browser's view already differs from the
      // server's, so move off revision 0 — that is the signal subscribers use to
      // re-derive rather than trust the server-resolved principal.
      if (
        Object.keys(stored.custom).length > 0 ||
        Object.keys(stored.overrides).length > 0
      ) {
        revision = Math.max(revision, 1);
      }
      return stored;
    }
  } catch {
    /* corrupt payload — fall back to the shipped catalogue */
  }
  return emptyState();
}

function getRegistryState(): RegistryState {
  state ??= load();
  return state;
}

function persist(): void {
  if (!isBrowser() || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode — changes just won't survive the reload */
  }
}

function commit<T>(mutator: (draft: RegistryState) => T): T {
  const draft = getRegistryState();
  const result = mutator(draft);
  revision += 1;
  persist();
  if (isBrowser()) window.dispatchEvent(new Event(EVENT));
  return result;
}

/** Monotonic revision — the stable snapshot for `useSyncExternalStore`. */
export function getRolesRevision(): number {
  // Touch the state so a registry persisted by an earlier session is loaded on
  // the first read, not only after the first mutation in this tab.
  getRegistryState();
  return revision;
}

/** Server snapshot: always 0, so hydration starts from the shipped catalogue. */
export function getServerRolesRevision(): number {
  return 0;
}

export function subscribeRoles(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Apply an override to a shipped definition. */
function withOverride(base: Role, override: RoleOverride | undefined): RoleRecord {
  return {
    id: base.id,
    label: override?.label ?? base.label,
    description: override?.description ?? base.description,
    permissions: override?.permissions ?? [...base.permissions],
    builtIn: true,
    modified: Boolean(override),
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: override?.updatedAt ?? "2024-01-01T00:00:00.000Z",
    updatedBy: override?.updatedBy,
  };
}

/** Every role the platform knows: shipped first, then custom, in creation order. */
export function listRoleRecords(): RoleRecord[] {
  const { custom, overrides } = getRegistryState();
  const builtIns = BUILT_IN_ROLE_IDS.map((id) =>
    withOverride(BUILT_IN_ROLES[id], overrides[id]),
  );
  const customs = Object.values(custom).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  return [...builtIns, ...customs];
}

/** One role, or `undefined` when the id is unknown to this runtime. */
export function getRoleRecord(id: RoleId): RoleRecord | undefined {
  const { custom, overrides } = getRegistryState();
  if (custom[id]) return custom[id];
  const base = BUILT_IN_ROLES[id];
  return base ? withOverride(base, overrides[id]) : undefined;
}

/** True when this id belongs to a role that ships with the product. */
export function isBuiltInRole(id: RoleId): boolean {
  return Boolean(BUILT_IN_ROLES[id]);
}

export interface RoleDraft {
  id?: RoleId;
  label: string;
  description: string;
  permissions: Permission[];
  basedOn?: RoleId;
}

/** Turn a label into a stable, unique role id (`Night Auditor` → `night_auditor`). */
export function slugifyRoleId(label: string): RoleId {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "role";
  if (!getRoleRecord(base)) return base;
  let n = 2;
  while (getRoleRecord(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/** Create a custom role. The caller is responsible for validation. */
export function createRoleRecord(draft: RoleDraft, actor?: string): RoleRecord {
  const now = new Date().toISOString();
  const record: RoleRecord = {
    id: draft.id ?? slugifyRoleId(draft.label),
    label: draft.label,
    description: draft.description,
    permissions: [...draft.permissions],
    builtIn: false,
    modified: false,
    basedOn: draft.basedOn,
    createdAt: now,
    updatedAt: now,
    updatedBy: actor,
  };
  return commit((draft_) => {
    draft_.custom[record.id] = record;
    return record;
  });
}

export interface RolePatch {
  label?: string;
  description?: string;
  permissions?: Permission[];
}

/**
 * Edit a role.
 *
 * A custom role is edited in place; a built-in is edited by recording an
 * override, which keeps the shipped definition intact for {@link resetRoleRecord}.
 */
export function updateRoleRecord(
  id: RoleId,
  patch: RolePatch,
  actor?: string,
): RoleRecord | undefined {
  const now = new Date().toISOString();
  return commit((draft) => {
    const custom = draft.custom[id];
    if (custom) {
      const next: RoleRecord = {
        ...custom,
        ...patch,
        permissions: patch.permissions ? [...patch.permissions] : custom.permissions,
        updatedAt: now,
        updatedBy: actor,
      };
      draft.custom[id] = next;
      return next;
    }
    if (!BUILT_IN_ROLES[id]) return undefined;
    const existing = draft.overrides[id];
    draft.overrides[id] = {
      label: patch.label ?? existing?.label,
      description: patch.description ?? existing?.description,
      permissions: patch.permissions
        ? [...patch.permissions]
        : existing?.permissions,
      updatedAt: now,
      updatedBy: actor,
    };
    return withOverride(BUILT_IN_ROLES[id], draft.overrides[id]);
  });
}

/** Remove a custom role. Built-ins are never removable. */
export function deleteRoleRecord(id: RoleId): boolean {
  return commit((draft) => {
    if (!draft.custom[id]) return false;
    delete draft.custom[id];
    return true;
  });
}

/** Drop an override, restoring the shipped definition. */
export function resetRoleRecord(id: RoleId): RoleRecord | undefined {
  return commit((draft) => {
    delete draft.overrides[id];
    const base = BUILT_IN_ROLES[id];
    return base ? withOverride(base, undefined) : undefined;
  });
}

/** Discard every runtime change — used by "reset demo data". */
export function resetRoleRegistry(): void {
  commit((draft) => {
    draft.custom = {};
    draft.overrides = {};
  });
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
