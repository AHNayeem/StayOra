import type { RoleId } from "../../rbac/types";
import type { StatusDef } from "../../lib/status";

export const USER_STATUS_VALUES = ["active", "invited", "suspended"] as const;
export type UserStatus = (typeof USER_STATUS_VALUES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  status: UserStatus;
  lastActiveAt: string;
  createdAt: string;
}

export const USER_STATUSES: readonly StatusDef<UserStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "invited", label: "Invited", tone: "info" },
  { value: "suspended", label: "Suspended", tone: "danger" },
];
