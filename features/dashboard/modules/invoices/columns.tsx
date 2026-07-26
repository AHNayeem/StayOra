import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { INVOICE_STATUSES, type Invoice } from "./types";

const statusTone = toneMap(INVOICE_STATUSES);
const statusLabel = labelMap(INVOICE_STATUSES);

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Number",
    enableHiding: false,
    meta: { label: "Number" },
    cell: ({ row }) => (
      <span className="font-medium text-ink">{row.original.number}</span>
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
    accessorKey: "issuedAt",
    header: "Issued",
    meta: { label: "Issued" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.issuedAt)}
      </span>
    ),
  },
  {
    accessorKey: "dueAt",
    header: "Due",
    meta: { label: "Due" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.dueAt)}
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
