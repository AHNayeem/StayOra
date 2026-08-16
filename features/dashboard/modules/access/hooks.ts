"use client";

import { useMutation, useQuery } from "../../data";
import { useRbac } from "../../rbac/rbac-provider";
import { roleService, type RoleRecord } from "../../rbac/role-service";
import type { Permission, RoleId } from "../../rbac/types";

export const roleKeys = {
  all: ["roles"] as const,
  list: () => ["roles", "list"] as const,
  detail: (id: string) => ["roles", "detail", id] as const,
  permissions: () => ["roles", "permissions"] as const,
};

const INVALIDATE = [roleKeys.all];

/** Every role the platform knows — shipped, overridden and custom. */
export function useRoles() {
  return useQuery<RoleRecord[]>({
    queryKey: roleKeys.list(),
    queryFn: () => roleService.getRoles(),
  });
}

export function useRole(id: RoleId, enabled = true) {
  return useQuery<RoleRecord>({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleService.getRole(id),
    enabled,
  });
}

/** The permission catalogue a role editor offers. */
export function usePermissionCatalogue() {
  return useQuery<Permission[]>({
    queryKey: roleKeys.permissions(),
    queryFn: () => roleService.getPermissions(),
    staleTime: 60_000,
  });
}

/** The signed-in user's name, recorded as "last changed by" on a role. */
function useActorName(): string {
  return useRbac().user.name;
}

export interface RoleFormValues {
  label: string;
  description: string;
  permissions: Permission[];
}

export function useCreateRole() {
  const actor = useActorName();
  return useMutation<RoleRecord, RoleFormValues & { basedOn?: RoleId }>({
    mutationFn: (input) => roleService.createRole({ ...input, actor }),
    invalidateKeys: INVALIDATE,
  });
}

export function useCloneRole() {
  const actor = useActorName();
  return useMutation<RoleRecord, { id: RoleId; label: string; description?: string }>({
    mutationFn: ({ id, ...input }) => roleService.cloneRole(id, { ...input, actor }),
    invalidateKeys: INVALIDATE,
  });
}

export function useUpdateRole() {
  const actor = useActorName();
  return useMutation<RoleRecord, { id: RoleId; input: Partial<RoleFormValues> }>({
    mutationFn: ({ id, input }) => roleService.updateRole(id, { ...input, actor }),
    invalidateKeys: INVALIDATE,
  });
}

/** Assign or remove permissions in one write. */
export function useUpdateRolePermissions() {
  const actor = useActorName();
  return useMutation<RoleRecord, { id: RoleId; permissions: Permission[] }>({
    mutationFn: ({ id, permissions }) =>
      roleService.updateRolePermissions(id, permissions, actor),
    invalidateKeys: INVALIDATE,
  });
}

export function useDeleteRole() {
  return useMutation<void, RoleId>({
    mutationFn: (id) => roleService.deleteRole(id),
    invalidateKeys: INVALIDATE,
  });
}

/** Restore a shipped role to its original grants. */
export function useResetRole() {
  return useMutation<RoleRecord, RoleId>({
    mutationFn: (id) => roleService.resetRole(id),
    invalidateKeys: INVALIDATE,
  });
}
