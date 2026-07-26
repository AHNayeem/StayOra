import type { ColumnDef } from "../../crud";
import { Avatar, StatusBadge, Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { ROLE_LIST } from "../../rbac/roles";
import { USER_STATUSES, type User } from "./types";

const statusTone = toneMap(USER_STATUSES);
const statusLabel = labelMap(USER_STATUSES);
const roleLabel = Object.fromEntries(ROLE_LIST.map((r) => [r.id, r.label]));

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "User",
    enableHiding: false,
    meta: { label: "User" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.original.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.name}</p>
          <p className="truncate text-xs text-muted">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "roleId",
    header: "Role",
    meta: { label: "Role" },
    cell: ({ row }) => <Tag>{roleLabel[row.original.roleId] ?? row.original.roleId}</Tag>,
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={statusTone[row.original.status]}>
        {statusLabel[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "lastActiveAt",
    header: "Last active",
    meta: { label: "Last active" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.lastActiveAt)}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    meta: { label: "Created" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];
