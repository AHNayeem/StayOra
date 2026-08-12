import Link from "next/link";
import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { REFUND_STATUSES } from "../../domain/lifecycle";
import type { Refund } from "../../domain/types";
import { REFUND_KIND_LABELS, REFUND_REASON_LABELS } from "./types";

const statusTone = toneMap(REFUND_STATUSES);
const statusLabel = labelMap(REFUND_STATUSES);

export const refundColumns: ColumnDef<Refund>[] = [
  {
    accessorKey: "reference",
    header: "Refund",
    enableHiding: false,
    meta: { label: "Refund" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{row.original.reference}</p>
        <Link
          href={`/dashboard/bookings/${row.original.bookingId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-primary hover:underline"
        >
          {row.original.bookingRef}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.customer.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.customer.organizationName ?? row.original.merchant.name}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    meta: { label: "Reason" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-body">{REFUND_REASON_LABELS[row.original.reason]}</p>
        <Badge
          size="sm"
          variant={
            row.original.kind === "full"
              ? "primary"
              : row.original.kind === "partial"
                ? "accent"
                : "neutral"
          }
        >
          {REFUND_KIND_LABELS[row.original.kind]}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "originalAmount",
    header: "Booking total",
    meta: { label: "Booking total", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.originalAmount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "cancellationFee",
    header: "Fee",
    meta: { label: "Fee", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {row.original.cancellationFee > 0
          ? formatCurrency(row.original.cancellationFee, row.original.currency)
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "refundAmount",
    header: "Refund",
    meta: { label: "Refund", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.refundAmount, row.original.currency)}
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
    accessorKey: "requestedAt",
    header: "Requested",
    meta: { label: "Requested" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.requestedAt)}
      </span>
    ),
  },
];
