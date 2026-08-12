import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { SETTLEMENT_STATUSES } from "../../domain/lifecycle";
import type { Settlement } from "../../domain/types";

const statusTone = toneMap(SETTLEMENT_STATUSES);
const statusLabel = labelMap(SETTLEMENT_STATUSES);

export const settlementColumns: ColumnDef<Settlement>[] = [
  {
    accessorKey: "reference",
    header: "Batch",
    enableHiding: false,
    meta: { label: "Batch" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{row.original.reference}</p>
        <p className="text-xs text-muted">
          {formatDate(row.original.periodStart)} – {formatDate(row.original.periodEnd)}
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
        <p className="truncate text-xs text-muted">
          {row.original.bookingCount} bookings · {row.original.method}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "grossSales",
    header: "Gross",
    meta: { label: "Gross", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.grossSales, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "commission",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-danger">
        −{formatCurrency(row.original.commission, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "refundAdjustment",
    header: "Refunds",
    meta: { label: "Refunds", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-danger">
        {row.original.refundAdjustment > 0
          ? `−${formatCurrency(row.original.refundAdjustment, row.original.currency)}`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "netPayable",
    header: "Net payable",
    meta: { label: "Net payable", align: "right" },
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-ink">
        {formatCurrency(row.original.netPayable, row.original.currency)}
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
    accessorKey: "scheduledFor",
    header: "Payout date",
    meta: { label: "Payout date" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {row.original.paidAt
          ? formatDate(row.original.paidAt)
          : formatDate(row.original.scheduledFor)}
      </span>
    ),
  },
];
