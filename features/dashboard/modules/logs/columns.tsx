import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { LOG_STATUSES, type AuditLog } from "./types";

const statusTone = toneMap(LOG_STATUSES);
const statusLabel = labelMap(LOG_STATUSES);

export const logColumns: ColumnDef<AuditLog>[] = [
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
    accessorKey: "actor",
    header: "Actor",
    meta: { label: "Actor" },
    cell: ({ row }) => <span className="font-medium text-ink">{row.original.actor}</span>,
  },
  {
    accessorKey: "action",
    header: "Action",
    meta: { label: "Action" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.action}</p>
        <p className="truncate text-xs text-muted">{row.original.target}</p>
      </div>
    ),
  },
  {
    accessorKey: "resource",
    header: "Resource",
    meta: { label: "Resource" },
    cell: ({ row }) => <Tag>{row.original.resource}</Tag>,
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
