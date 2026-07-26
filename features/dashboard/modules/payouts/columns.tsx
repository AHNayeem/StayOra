import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { PAYOUT_STATUSES, type Payout } from "./types";

const statusTone = toneMap(PAYOUT_STATUSES);
const statusLabel = labelMap(PAYOUT_STATUSES);

export const payoutColumns: ColumnDef<Payout>[] = [
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
    accessorKey: "merchant",
    header: "Merchant",
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <span className="text-body">{row.original.merchant}</span>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    meta: { label: "Method" },
    cell: ({ row }) => <span className="text-body">{row.original.method}</span>,
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
