import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { BOOKING_STATUSES, PAYMENT_STATUSES } from "../../domain/lifecycle";
import type { Booking } from "../../domain/types";
import { PRODUCT_KIND_LABELS, SEGMENT_LABELS } from "./types";

const statusTone = toneMap(BOOKING_STATUSES);
const statusLabel = labelMap(BOOKING_STATUSES);
const paymentTone = toneMap(PAYMENT_STATUSES);
const paymentLabel = labelMap(PAYMENT_STATUSES);

/**
 * Column definitions for the bookings table. Presentation only — statuses map to
 * tones via the registries (never hardcoded here), money/dates go through the
 * shared locale-aware formatters, and commission comes off the booking's money
 * breakdown rather than being recomputed.
 *
 * Booking status and payment status are separate columns on purpose: "payment
 * captured + booking failed" is a real, distinct state operators must see.
 */
export const bookingColumns: ColumnDef<Booking>[] = [
  {
    accessorKey: "reference",
    header: "Reference",
    enableHiding: false,
    meta: { label: "Reference" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{row.original.reference}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Badge variant={row.original.segment === "b2b" ? "accent" : "neutral"} size="sm">
            {SEGMENT_LABELS[row.original.segment]}
          </Badge>
          <span className="capitalize">{row.original.channel.replace(/_/g, " ")}</span>
        </p>
      </div>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.customer.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.customer.organizationName ?? row.original.customer.email}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "productTitle",
    header: "Product",
    meta: { label: "Product" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.productTitle}</p>
        <p className="truncate text-xs text-muted">
          {PRODUCT_KIND_LABELS[row.original.productKind]} · {row.original.destination}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "merchant",
    header: "Merchant",
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <span className="truncate text-body">{row.original.merchant.name}</span>
    ),
  },
  {
    accessorKey: "startAt",
    header: "Travel date",
    meta: { label: "Travel date" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.startAt)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    meta: { label: "Total", align: "right" },
    cell: ({ row }) => (
      <div className="text-right">
        <p className="font-medium tabular-nums text-ink">
          {formatCurrency(row.original.money.total, row.original.money.currency)}
        </p>
        {row.original.money.discount > 0 && (
          <p className="text-xs tabular-nums text-success">
            −{formatCurrency(row.original.money.discount, row.original.money.currency)}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "commission",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    cell: ({ row }) => (
      <div className="text-right">
        <p className="tabular-nums text-body">
          {formatCurrency(row.original.money.commission, row.original.money.currency)}
        </p>
        <p className="text-xs text-muted">{row.original.money.commissionRate}%</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Booking status",
    meta: { label: "Booking status" },
    cell: ({ row }) => (
      <StatusBadge tone={statusTone[row.original.status]}>
        {statusLabel[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    meta: { label: "Payment" },
    cell: ({ row }) => (
      <StatusBadge tone={paymentTone[row.original.payment.status]}>
        {paymentLabel[row.original.payment.status]}
      </StatusBadge>
    ),
  },
];
