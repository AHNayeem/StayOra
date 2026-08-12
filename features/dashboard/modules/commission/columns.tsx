import Link from "next/link";
import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import type { CommissionEntry } from "../../domain/types";
import { PRODUCT_KIND_LABELS } from "../bookings/types";
import { COMMISSION_STATUSES } from "./types";

const statusTone = toneMap(COMMISSION_STATUSES);
const statusLabel = labelMap(COMMISSION_STATUSES);

export const commissionColumns: ColumnDef<CommissionEntry>[] = [
  {
    accessorKey: "reference",
    header: "Entry",
    enableHiding: false,
    meta: { label: "Entry" },
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
    accessorKey: "merchantName",
    header: "Merchant",
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.merchantName}</p>
        <p className="truncate text-xs text-muted">
          {PRODUCT_KIND_LABELS[row.original.productKind]}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "segment",
    header: "Segment",
    meta: { label: "Segment" },
    cell: ({ row }) => (
      <Badge size="sm" variant={row.original.segment === "b2b" ? "accent" : "neutral"}>
        {row.original.segment.toUpperCase()}
      </Badge>
    ),
  },
  {
    accessorKey: "netSale",
    header: "Net sale",
    meta: { label: "Net sale", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.netSale, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "rate",
    header: "Rate",
    meta: { label: "Rate", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{row.original.rate}%</span>
    ),
  },
  {
    accessorKey: "commission",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    cell: ({ row }) => (
      <div className="text-right">
        <p className="font-medium tabular-nums text-ink">
          {formatCurrency(row.original.commission, row.original.currency)}
        </p>
        {row.original.reversed > 0 && (
          <p className="text-xs tabular-nums text-danger">
            −{formatCurrency(row.original.reversed, row.original.currency)} reversed
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "merchantEarning",
    header: "Merchant earning",
    meta: { label: "Merchant earning", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.merchantEarning, row.original.currency)}
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
