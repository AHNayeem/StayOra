import { Star } from "lucide-react";
import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { HOTEL_STATUSES, type Hotel } from "./types";

const statusTone = toneMap(HOTEL_STATUSES);
const statusLabel = labelMap(HOTEL_STATUSES);

export const hotelColumns: ColumnDef<Hotel>[] = [
  {
    accessorKey: "name",
    header: "Property",
    enableHiding: false,
    meta: { label: "Property" },
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
    accessorKey: "rooms",
    header: "Rooms",
    meta: { label: "Rooms", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.rooms)}</span>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    meta: { label: "Rating", align: "right" },
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
        {row.original.rating.toFixed(1)}
      </span>
    ),
  },
  {
    accessorKey: "pricePerNight",
    header: "Price / night",
    meta: { label: "Price / night", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.pricePerNight, row.original.currency)}
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
