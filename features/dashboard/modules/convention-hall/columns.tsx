import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CONVENTION_HALL_STATUSES, type ConventionHall } from "./types";

const statusTone = toneMap(CONVENTION_HALL_STATUSES);
const statusLabel = labelMap(CONVENTION_HALL_STATUSES);

export const conventionHallColumns: ColumnDef<ConventionHall>[] = [
  {
    accessorKey: "name",
    header: "Venue",
    enableHiding: false,
    meta: { label: "Venue" },
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
    accessorKey: "capacity",
    header: "Capacity",
    meta: { label: "Capacity", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.capacity)}</span>
    ),
  },
  {
    accessorKey: "halls",
    header: "Halls",
    meta: { label: "Halls", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.halls)}</span>
    ),
  },
  {
    accessorKey: "pricePerDay",
    header: "Price / day",
    meta: { label: "Price / day", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.pricePerDay, row.original.currency)}
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
