/**
 * Role & permission API surface.
 *
 * These are the functions the Roles screen calls — `getRoles()`, `createRole()`,
 * `updateRolePermissions()` and friends. They are async, validate their input
 * and throw the same normalized {@link ApiError} the rest of the data layer
 * uses, so replacing the registry underneath with `fetch("/api/roles")` is a
 * body-only change and no caller moves.
 */

import { ApiError } from "../data/errors";
import { ACTIONS, PERMISSION_WILDCARD, RESOURCES } from "./permissions";
import {
  createRoleRecord,
  deleteRoleRecord,
  getRoleRecord,
  isBuiltInRole,
  listRoleRecords,
  resetRoleRecord,
  slugifyRoleId,
  updateRoleRecord,
  type RoleDraft,
  type RolePatch,
  type RoleRecord,
} from "./role-registry";
import type { Permission, RoleId } from "./types";

/** Matches the latency the domain services simulate, so loading states are real. */
const LATENCY = 240;

function delay<T>(value: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function invalid(message: string): never {
  throw new ApiError({ kind: "validation", message });
}

function notFound(id: string): never {
  throw new ApiError({ kind: "not-found", message: `Role “${id}” no longer exists.` });
}

/** Every permission string the platform understands, plus the wildcards. */
export function permissionCatalogue(): Permission[] {
  return RESOURCES.flatMap((resource) => [
    `${resource}:*`,
    ...ACTIONS.map((action) => `${resource}:${action}`),
  ]);
}

/** Roles that hold `permission`, honouring `resource:*` and `*:*`. */
export function rolesHolding(permission: Permission, roles: RoleRecord[]): RoleRecord[] {
  const [resource] = permission.split(":");
  return roles.filter((role) =>
    role.permissions.some(
      (granted) =>
        granted === PERMISSION_WILDCARD ||
        granted === permission ||
        granted === `${resource}:*`,
    ),
  );
}

function assertDraft(draft: { label: string; permissions: Permission[] }): void {
  if (draft.label.trim().length < 3) {
    invalid("A role name needs at least 3 characters.");
  }
  if (draft.permissions.length === 0) {
    invalid("A role must grant at least one permission.");
  }
}

export interface CreateRoleInput extends Omit<RoleDraft, "id"> {
  /** Optional explicit id; derived from the label when omitted. */
  id?: RoleId;
  actor?: string;
}

export const roleService = {
  /** Every role — shipped, overridden and custom. */
  async getRoles(): Promise<RoleRecord[]> {
    return delay(listRoleRecords());
  },

  /** One role. Throws `not-found` for an unknown id. */
  async getRole(id: RoleId): Promise<RoleRecord> {
    const record = getRoleRecord(id);
    return delay(record ?? notFound(id));
  },

  /** The permission catalogue a role editor offers. */
  async getPermissions(): Promise<Permission[]> {
    return delay(permissionCatalogue(), 80);
  },

  async createRole(input: CreateRoleInput): Promise<RoleRecord> {
    assertDraft(input);
    const id = input.id?.trim() || slugifyRoleId(input.label);
    if (getRoleRecord(id)) invalid(`A role with the id “${id}” already exists.`);
    return delay(
      createRoleRecord(
        {
          id,
          label: input.label.trim(),
          description: input.description.trim(),
          permissions: input.permissions,
          basedOn: input.basedOn,
        },
        input.actor,
      ),
    );
  },

  /**
   * Clone a role. The copy is always custom, even when the source ships with
   * the product — which is the point: it is how you get "Admin, but without
   * finance" without editing Admin.
   */
  async cloneRole(
    id: RoleId,
    input: { label: string; description?: string; actor?: string },
  ): Promise<RoleRecord> {
    const source = getRoleRecord(id) ?? notFound(id);
    return roleService.createRole({
      label: input.label,
      description: input.description?.trim() || `Cloned from ${source.label}.`,
      permissions: [...source.permissions],
      basedOn: source.id,
      actor: input.actor,
    });
  },

  async updateRole(
    id: RoleId,
    patch: RolePatch & { actor?: string },
  ): Promise<RoleRecord> {
    const existing = getRoleRecord(id) ?? notFound(id);
    const next = {
      label: patch.label ?? existing.label,
      permissions: patch.permissions ?? existing.permissions,
    };
    assertDraft(next);
    const { actor, ...rest } = patch;
    return delay(updateRoleRecord(id, rest, actor) ?? notFound(id));
  },

  /** Replace a role's permission set. */
  async updateRolePermissions(
    id: RoleId,
    permissions: Permission[],
    actor?: string,
  ): Promise<RoleRecord> {
    return roleService.updateRole(id, { permissions, actor });
  },

  /**
   * Delete a custom role. Built-ins are refused rather than silently ignored —
   * "reset" is the operation that exists for those.
   */
  async deleteRole(id: RoleId): Promise<void> {
    if (isBuiltInRole(id)) {
      throw new ApiError({
        kind: "forbidden",
        message: "Roles that ship with the platform can't be deleted. Reset it instead.",
      });
    }
    if (!deleteRoleRecord(id)) notFound(id);
    return delay(undefined, 120);
  },

  /** Restore a built-in role to its shipped grants. */
  async resetRole(id: RoleId): Promise<RoleRecord> {
    if (!isBuiltInRole(id)) {
      throw new ApiError({
        kind: "validation",
        message: "Only roles that ship with the platform can be reset.",
      });
    }
    return delay(resetRoleRecord(id) ?? notFound(id));
  },
};

export type { RoleRecord } from "./role-registry";
