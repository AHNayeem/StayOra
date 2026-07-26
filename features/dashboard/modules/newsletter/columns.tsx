import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { SUBSCRIBER_SOURCES, SUBSCRIBER_STATUSES, type Subscriber } from "./types";

const statusTone = toneMap(SUBSCRIBER_STATUSES);
const statusLabel = labelMap(SUBSCRIBER_STATUSES);
const sourceLabel = labelMap(SUBSCRIBER_SOURCES);

export const newsletterColumns: ColumnDef<Subscriber>[] = [
  {
    accessorKey: "email",
    header: "Subscriber",
    enableHiding: false,
    meta: { label: "Subscriber" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.email}</p>
        <p className="truncate text-xs text-muted">{row.original.name}</p>
      </div>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    meta: { label: "Source" },
    cell: ({ row }) => <Tag variant="soft">{sourceLabel[row.original.source]}</Tag>,
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
    accessorKey: "joinedAt",
    header: "Joined",
    meta: { label: "Joined" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.joinedAt)}
      </span>
    ),
  },
];
