import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { APARTMENT_STATUSES, type Apartment } from "./types";

const statusTone = toneMap(APARTMENT_STATUSES);
const statusLabel = labelMap(APARTMENT_STATUSES);

export const apartmentColumns: ColumnDef<Apartment>[] = [
  {
    accessorKey: "name",
    header: "Apartment",
    enableHiding: false,
    meta: { label: "Apartment" },
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
    accessorKey: "bedrooms",
    header: "Bedrooms",
    meta: { label: "Bedrooms", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.bedrooms)}</span>
    ),
  },
  {
    accessorKey: "maxGuests",
    header: "Max guests",
    meta: { label: "Max guests", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.maxGuests)}</span>
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
