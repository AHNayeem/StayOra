import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CACHE_STATUSES, type CacheStore } from "./types";

const statusTone = toneMap(CACHE_STATUSES);
const statusLabel = labelMap(CACHE_STATUSES);

export const cacheColumns: ColumnDef<CacheStore>[] = [
  {
    accessorKey: "name",
    header: "Store",
    enableHiding: false,
    meta: { label: "Store" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium text-ink">{row.original.name}</span>
        <Tag variant="outline">{row.original.driver}</Tag>
      </div>
    ),
  },
  {
    accessorKey: "hitRate",
    header: "Hit rate",
    meta: { label: "Hit rate", align: "right" },
    cell: ({ row }) => {
      const low = row.original.hitRate < 80;
      return (
        <span className={low ? "tabular-nums text-warning" : "tabular-nums text-body"}>
          {row.original.hitRate.toFixed(1)}%
        </span>
      );
    },
  },
  {
    accessorKey: "keys",
    header: "Keys",
    meta: { label: "Keys", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{formatNumber(row.original.keys)}</span>
    ),
  },
  {
    accessorKey: "memoryMb",
    header: "Memory",
    meta: { label: "Memory", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{formatNumber(row.original.memoryMb)} MB</span>
    ),
  },
  {
    accessorKey: "evictions",
    header: "Evictions",
    meta: { label: "Evictions", align: "right" },
    cell: ({ row }) => {
      const high = row.original.evictions >= 1000;
      return (
        <span className={high ? "tabular-nums text-warning" : "tabular-nums text-muted"}>
          {formatNumber(row.original.evictions)}
        </span>
      );
    },
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
