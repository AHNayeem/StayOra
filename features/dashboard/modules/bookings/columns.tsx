import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { BOOKING_STATUSES, type Booking } from "./types";

const statusTone = toneMap(BOOKING_STATUSES);
const statusLabel = labelMap(BOOKING_STATUSES);

/**
 * Column definitions for the bookings table. Presentation only — statuses map to
 * tones via the registry (never hardcoded here), money/dates go through the
 * shared locale-aware formatters.
 */
export const bookingColumns: ColumnDef<Booking>[] = [
  {
    accessorKey: "reference",
    header: "Reference",
    enableHiding: false,
    meta: { label: "Reference" },
    cell: ({ row }) => (
      <span className="font-medium text-ink">{row.original.reference}</span>
    ),
  },
  {
    accessorKey: "guestName",
    header: "Guest",
    meta: { label: "Guest" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.guestName}</p>
        <p className="truncate text-xs text-muted">{row.original.guestEmail}</p>
      </div>
    ),
  },
  {
    accessorKey: "property",
    header: "Property",
    meta: { label: "Property" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.property}</p>
        <p className="truncate text-xs text-muted">{row.original.propertyType}</p>
      </div>
    ),
  },
  {
    accessorKey: "checkIn",
    header: "Check-in",
    meta: { label: "Check-in" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.checkIn)}
      </span>
    ),
  },
  {
    accessorKey: "nights",
    header: "Nights",
    meta: { label: "Nights", align: "right" },
    cell: ({ row }) => <span className="tabular-nums">{row.original.nights}</span>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { label: "Amount", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.amount, row.original.currency)}
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
];
