import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { LOGIN_METHODS, LOGIN_STATUSES, type LoginLog } from "./types";

const statusTone = toneMap(LOGIN_STATUSES);
const statusLabel = labelMap(LOGIN_STATUSES);
const methodLabel = labelMap(LOGIN_METHODS);

export const loginLogColumns: ColumnDef<LoginLog>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    enableHiding: false,
    meta: { label: "When" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "user",
    header: "User",
    meta: { label: "User" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.user}</p>
        <p className="truncate text-xs text-muted">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    meta: { label: "Method" },
    cell: ({ row }) => <Tag>{methodLabel[row.original.method]}</Tag>,
  },
  {
    accessorKey: "location",
    header: "Location",
    meta: { label: "Location" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-body">{row.original.location}</p>
        <p className="truncate text-xs text-muted">{row.original.device}</p>
      </div>
    ),
  },
  {
    accessorKey: "ip",
    header: "IP address",
    meta: { label: "IP address" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-body">{row.original.ip}</span>
    ),
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
];
