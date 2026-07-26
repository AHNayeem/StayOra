import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { ACTIVITY_STATUSES, type Activity } from "./types";

const statusTone = toneMap(ACTIVITY_STATUSES);
const statusLabel = labelMap(ACTIVITY_STATUSES);

export const activityColumns: ColumnDef<Activity>[] = [
  {
    accessorKey: "name",
    header: "Activity",
    enableHiding: false,
    meta: { label: "Activity" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.city}, {row.original.country}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    meta: { label: "Category" },
    cell: ({ row }) => <span className="text-body">{row.original.category}</span>,
  },
  {
    accessorKey: "durationHours",
    header: "Duration",
    meta: { label: "Duration", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.durationHours)} h</span>
    ),
  },
  {
    accessorKey: "capacity",
    header: "Capacity",
    meta: { label: "Capacity", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.capacity)}</span>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    meta: { label: "Price", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.price, row.original.currency)}
      </span>
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
  {
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.updatedAt)}
      </span>
    ),
  },
];
