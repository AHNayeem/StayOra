import { AlertTriangle } from "lucide-react";
import {
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_TONES,
  type Payout,
} from "@/features/dashboard/domain";
import type { ColumnDef } from "../../crud";
import { StatusBadge, Tooltip } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";

export const payoutColumns: ColumnDef<Payout>[] = [
  {
    accessorKey: "reference",
    header: "Reference",
    enableHiding: false,
    meta: { label: "Reference" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="font-medium text-ink">{row.original.reference}</span>
        <p className="truncate text-xs text-muted">
          {formatDate(row.original.periodStart)} – {formatDate(row.original.periodEnd)} ·{" "}
          {row.original.bookingCount} bookings
        </p>
      </div>
    ),
  },
  {
    accessorKey: "merchantName",
    header: "Merchant",
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.merchantName}</p>
        <p className="truncate text-xs text-muted">{row.original.destination}</p>
      </div>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    meta: { label: "Method" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-body">{row.original.method}</p>
        <p className="truncate text-xs text-muted">
          {row.original.scheduleLabel} · {row.original.termDays}-day terms
        </p>
      </div>
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
      <div className="flex items-center gap-1.5">
        <StatusBadge tone={PAYOUT_STATUS_TONES[row.original.status]}>
          {PAYOUT_STATUS_LABELS[row.original.status]}
        </StatusBadge>
        {row.original.blocked && row.original.status !== "paid" && (
          <Tooltip content={row.original.blockedReason ?? "No verified payout account"}>
            <AlertTriangle className="size-4 text-danger" aria-label="Blocked" />
          </Tooltip>
        )}
      </div>
    ),
  },
  {
    accessorKey: "scheduledFor",
    header: "Scheduled",
    meta: { label: "Scheduled" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.paidAt ?? row.original.scheduledFor)}
      </span>
    ),
  },
];
