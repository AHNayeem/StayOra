import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { TRANSPORT_STATUSES, type Transport } from "./types";

const statusTone = toneMap(TRANSPORT_STATUSES);
const statusLabel = labelMap(TRANSPORT_STATUSES);

export const transportColumns: ColumnDef<Transport>[] = [
  {
    accessorKey: "name",
    header: "Service",
    enableHiding: false,
    meta: { label: "Service" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.route}</p>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => <span className="text-body">{row.original.type}</span>,
  },
  {
    accessorKey: "seats",
    header: "Seats",
    meta: { label: "Seats", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.seats)}</span>
    ),
  },
  {
    accessorKey: "pricePerTrip",
    header: "Price / trip",
    meta: { label: "Price / trip", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.pricePerTrip, row.original.currency)}
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
