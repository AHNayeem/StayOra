import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
} from "./types";

const statusTone = toneMap(TICKET_STATUSES);
const statusLabel = labelMap(TICKET_STATUSES);
const priorityTone = toneMap(TICKET_PRIORITIES);
const priorityLabel = labelMap(TICKET_PRIORITIES);

export const ticketColumns: ColumnDef<Ticket>[] = [
  {
    accessorKey: "subject",
    header: "Ticket",
    enableHiding: false,
    meta: { label: "Ticket" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.subject}</p>
        <p className="truncate text-xs text-muted">
          {row.original.reference} · {row.original.requester}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    meta: { label: "Priority" },
    cell: ({ row }) => (
      <StatusBadge tone={priorityTone[row.original.priority]}>
        {priorityLabel[row.original.priority]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "assignee",
    header: "Assignee",
    meta: { label: "Assignee" },
    cell: ({ row }) => <span className="text-body">{row.original.assignee}</span>,
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
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDateTime(row.original.updatedAt)}
      </span>
    ),
  },
];
