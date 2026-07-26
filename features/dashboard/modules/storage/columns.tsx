import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { STORAGE_STATUSES, formatBytes, type StorageBucket } from "./types";

const statusTone = toneMap(STORAGE_STATUSES);
const statusLabel = labelMap(STORAGE_STATUSES);

function usedPercent(row: StorageBucket): number {
  if (row.capacityBytes <= 0) return 0;
  return Math.min(100, Math.round((row.usedBytes / row.capacityBytes) * 100));
}

export const storageColumns: ColumnDef<StorageBucket>[] = [
  {
    accessorKey: "name",
    header: "Bucket",
    enableHiding: false,
    meta: { label: "Bucket" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.region}</p>
      </div>
    ),
  },
  {
    accessorKey: "driver",
    header: "Driver",
    meta: { label: "Driver" },
    cell: ({ row }) => <Tag variant="outline">{row.original.driver}</Tag>,
  },
  {
    accessorKey: "usedBytes",
    header: "Usage",
    meta: { label: "Usage" },
    cell: ({ row }) => {
      const pct = usedPercent(row.original);
      const barTone =
        pct >= 90 ? "bg-danger" : pct >= 75 ? "bg-warning" : "bg-primary";
      return (
        <div className="min-w-40 max-w-56">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-body">
              {formatBytes(row.original.usedBytes)} / {formatBytes(row.original.capacityBytes)}
            </span>
            <span className="tabular-nums text-muted">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted">
            <div className={`h-full rounded-pill ${barTone}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "files",
    header: "Objects",
    meta: { label: "Objects", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{formatNumber(row.original.files)}</span>
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
