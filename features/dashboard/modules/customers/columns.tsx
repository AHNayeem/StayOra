import type { ColumnDef } from "../../crud";
import { Avatar, StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CUSTOMER_STATUSES, type Customer } from "./types";

const statusTone = toneMap(CUSTOMER_STATUSES);
const statusLabel = labelMap(CUSTOMER_STATUSES);

export const customerColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: "Customer",
    enableHiding: false,
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.original.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.name}</p>
          <p className="truncate text-xs text-muted">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    meta: { label: "Country" },
    cell: ({ row }) => <span className="text-body">{row.original.country}</span>,
  },
  {
    accessorKey: "bookings",
    header: "Bookings",
    meta: { label: "Bookings", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{formatNumber(row.original.bookings)}</span>
    ),
  },
  {
    accessorKey: "totalSpent",
    header: "Total spent",
    meta: { label: "Total spent", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.totalSpent, row.original.currency)}
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
