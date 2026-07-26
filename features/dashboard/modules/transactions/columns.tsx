import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type Transaction,
} from "./types";

const typeLabel = labelMap(TRANSACTION_TYPES);
const statusTone = toneMap(TRANSACTION_STATUSES);
const statusLabel = labelMap(TRANSACTION_STATUSES);

export const transactionColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "reference",
    header: "Reference",
    enableHiding: false,
    meta: { label: "Reference" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="font-medium text-ink">{row.original.reference}</span>
        <p className="truncate text-xs text-muted">{row.original.description}</p>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => (
      <Tag variant="soft">{typeLabel[row.original.type]}</Tag>
    ),
  },
  {
    accessorKey: "merchant",
    header: "Merchant",
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <span className="truncate text-body">{row.original.merchant}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { label: "Amount", align: "right" },
    cell: ({ row }) => {
      const credit = row.original.direction === "credit";
      const Icon = credit ? ArrowDownLeft : ArrowUpRight;
      return (
        <span
          className={`inline-flex items-center justify-end gap-1 font-medium tabular-nums ${
            credit ? "text-primary" : "text-ink"
          }`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {credit ? "+" : "−"}
          {formatCurrency(row.original.amount, row.original.currency)}
        </span>
      );
    },
  },
  {
    accessorKey: "balanceAfter",
    header: "Balance",
    meta: { label: "Balance", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted">
        {formatCurrency(row.original.balanceAfter, row.original.currency)}
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
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
];
