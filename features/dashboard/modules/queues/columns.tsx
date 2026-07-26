import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { QUEUE_STATUSES, type Queue } from "./types";

const statusTone = toneMap(QUEUE_STATUSES);
const statusLabel = labelMap(QUEUE_STATUSES);

export const queueColumns: ColumnDef<Queue>[] = [
  {
    accessorKey: "name",
    header: "Queue",
    enableHiding: false,
    meta: { label: "Queue" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-ink">{row.original.name}</span>
        <Tag variant="outline">{row.original.driver}</Tag>
      </div>
    ),
  },
  {
    accessorKey: "pending",
    header: "Pending",
    meta: { label: "Pending", align: "right" },
    cell: ({ row }) => {
      const high = row.original.pending >= 300;
      return (
        <span className={high ? "tabular-nums text-warning" : "tabular-nums text-body"}>
          {formatNumber(row.original.pending)}
        </span>
      );
    },
  },
  {
    accessorKey: "processing",
    header: "Processing",
    meta: { label: "Processing", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{formatNumber(row.original.processing)}</span>
    ),
  },
  {
    accessorKey: "failed",
    header: "Failed",
    meta: { label: "Failed", align: "right" },
    cell: ({ row }) => {
      const bad = row.original.failed > 0;
      return (
        <span className={bad ? "tabular-nums text-danger" : "tabular-nums text-muted"}>
          {formatNumber(row.original.failed)}
        </span>
      );
    },
  },
  {
    accessorKey: "throughputPerMin",
    header: "Throughput",
    meta: { label: "Throughput", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{formatNumber(row.original.throughputPerMin)}/min</span>
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
