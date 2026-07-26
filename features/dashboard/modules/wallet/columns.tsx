import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { WALLET_STATUSES, type MerchantWallet } from "./types";

const statusTone = toneMap(WALLET_STATUSES);
const statusLabel = labelMap(WALLET_STATUSES);

export const walletColumns: ColumnDef<MerchantWallet>[] = [
  {
    accessorKey: "merchant",
    header: "Merchant",
    enableHiding: false,
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <span className="font-medium text-ink">{row.original.merchant}</span>
    ),
  },
  {
    accessorKey: "available",
    header: "Available",
    meta: { label: "Available", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-primary">
        {formatCurrency(row.original.available, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "pending",
    header: "Pending",
    meta: { label: "Pending", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.pending, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "reserved",
    header: "Reserved",
    meta: { label: "Reserved", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted">
        {formatCurrency(row.original.reserved, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "lifetimeEarnings",
    header: "Lifetime",
    meta: { label: "Lifetime", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.lifetimeEarnings, row.original.currency)}
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
    accessorKey: "lastActivity",
    header: "Last activity",
    meta: { label: "Last activity" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.lastActivity)}
      </span>
    ),
  },
];
