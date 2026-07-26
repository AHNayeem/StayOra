import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { REFUND_STATUSES, type Refund } from "./types";

const statusTone = toneMap(REFUND_STATUSES);
const statusLabel = labelMap(REFUND_STATUSES);

export const refundColumns: ColumnDef<Refund>[] = [
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
    accessorKey: "customer",
    header: "Customer",
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.customer}</p>
        <p className="truncate text-xs text-muted">{row.original.bookingRef}</p>
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    meta: { label: "Reason" },
    cell: ({ row }) => (
      <span className="text-body">{row.original.reason}</span>
    ),
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
  {
    accessorKey: "createdAt",
    header: "Date",
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];
