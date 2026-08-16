/**
 * Access module — runtime role management and the permission catalogue.
 *
 * Roles are data now, not a constant: create, clone, edit, assign permissions
 * and reset. Everything routes through `roleService` (rbac/role-service.ts), so
 * these screens are already written against the API that will replace it.
 */
export { RolesView } from "./roles-view";
export { PermissionsView } from "./permissions-view";
export { PermissionEditor } from "./permission-editor";
export { RoleForm } from "./role-form";
export type { RoleFormMode } from "./role-form";
export {
  roleKeys,
  useRoles,
  useRole,
  usePermissionCatalogue,
  useCreateRole,
  useCloneRole,
  useUpdateRole,
  useUpdateRolePermissions,
  useDeleteRole,
  useResetRole,
} from "./hooks";
export { resourceCoverage, grantCount } from "./matrix";
export type { Coverage } from "./matrix";
