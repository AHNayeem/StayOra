import type { ColumnDef } from "../../crud";
import { Badge, Tag } from "../../ui";
import { formatDateTime } from "../../lib/format";
import type { AuditLogEntry } from "../../domain/types";
import { AUDIT_ACTION_LABELS, HIGH_RISK_ACTIONS } from "./types";

export const logColumns: ColumnDef<AuditLogEntry>[] = [
  {
    accessorKey: "at",
    header: "When",
    enableHiding: false,
    meta: { label: "When" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDateTime(row.original.at)}
      </span>
    ),
  },
  {
    accessorKey: "actorName",
    header: "Actor",
    meta: { label: "Actor" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.actorName}</p>
        <p className="truncate text-xs capitalize text-muted">
          {row.original.actorRole.replace(/_/g, " ")}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    meta: { label: "Action" },
    cell: ({ row }) => (
      <Badge
        size="sm"
        variant={HIGH_RISK_ACTIONS.includes(row.original.action) ? "danger" : "neutral"}
      >
        {AUDIT_ACTION_LABELS[row.original.action] ?? row.original.action}
      </Badge>
    ),
  },
  {
    accessorKey: "summary",
    header: "Detail",
    meta: { label: "Detail" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.summary}</p>
        {(row.original.from || row.original.to) && (
          <p className="truncate text-xs text-muted">
            {row.original.from ? `${row.original.from} → ` : ""}
            {row.original.to}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "entity",
    header: "Entity",
    meta: { label: "Entity" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <Tag>{row.original.entity.replace(/_/g, " ")}</Tag>
        <p className="mt-1 truncate text-xs text-muted">{row.original.entityLabel}</p>
      </div>
    ),
  },
  {
    accessorKey: "ip",
    header: "IP address",
    meta: { label: "IP address" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-body">{row.original.ip ?? "—"}</span>
    ),
  },
];
