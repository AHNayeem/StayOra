import Link from "next/link";
import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  TIER_LABELS,
  type InsurancePlan,
  type InsurancePolicy,
} from "../../domain/insurance";

const PLAN_STATUS_TONES = {
  active: "success",
  draft: "neutral",
  retired: "warning",
} as const;

const POLICY_STATUS_TONES = {
  active: "success",
  cancelled: "neutral",
  refunded: "danger",
  expired: "warning",
} as const;

/** How a plan's premium is worked out, in one short phrase. */
function priceLabel(plan: InsurancePlan): string {
  switch (plan.pricingModel) {
    case "per_traveler":
      return `${formatCurrency(plan.price, "USD")} per traveller`;
    case "percent_of_trip":
      return `${plan.price}% of trip value`;
    default:
      return `${formatCurrency(plan.price, "USD")} per booking`;
  }
}

export const planColumns: ColumnDef<InsurancePlan>[] = [
  {
    accessorKey: "name",
    header: "Plan",
    enableHiding: false,
    meta: { label: "Plan" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.providerName}</p>
      </div>
    ),
  },
  {
    accessorKey: "tier",
    header: "Tier",
    meta: { label: "Tier" },
    cell: ({ row }) => (
      <Badge size="sm" variant={row.original.tier === "premium" ? "accent" : "neutral"}>
        {TIER_LABELS[row.original.tier]}
      </Badge>
    ),
  },
  {
    accessorKey: "price",
    header: "Premium",
    meta: { label: "Premium", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{priceLabel(row.original)}</span>
    ),
  },
  {
    accessorKey: "commissionValue",
    header: "Platform cut",
    meta: { label: "Platform cut", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {row.original.commissionType === "percent"
          ? `${row.original.commissionValue}%`
          : formatCurrency(row.original.commissionValue, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "coverage",
    header: "Cover",
    meta: { label: "Cover" },
    cell: ({ row }) => (
      <span className="text-xs text-muted">
        {row.original.coverage.filter((c) => c.limit > 0).length} covered risks
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={PLAN_STATUS_TONES[row.original.status]}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </StatusBadge>
    ),
  },
];

export const policyColumns: ColumnDef<InsurancePolicy>[] = [
  {
    accessorKey: "reference",
    header: "Policy",
    enableHiding: false,
    meta: { label: "Policy" },
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
    accessorKey: "planName",
    header: "Plan",
    meta: { label: "Plan" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.planName}</p>
        <p className="truncate text-xs text-muted">{row.original.providerName}</p>
      </div>
    ),
  },
  {
    accessorKey: "customerName",
    header: "Customer",
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.customerName}</p>
        <p className="truncate text-xs text-muted">
          {row.original.travelers} traveller{row.original.travelers === 1 ? "" : "s"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "premium",
    header: "Premium",
    meta: { label: "Premium", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.premium, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "providerShare",
    header: "Provider",
    meta: { label: "Provider", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted">
        {formatCurrency(row.original.providerShare, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "platformRevenue",
    header: "Platform revenue",
    meta: { label: "Platform revenue", align: "right" },
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-ink">
        {formatCurrency(
          row.original.platformRevenue - row.original.revenueReversed,
          row.original.currency,
        )}
      </span>
    ),
  },
  {
    accessorKey: "purchasedAt",
    header: "Sold",
    meta: { label: "Sold" },
    cell: ({ row }) => (
      <span className="text-xs text-muted">{formatDate(row.original.purchasedAt)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={POLICY_STATUS_TONES[row.original.status]}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </StatusBadge>
    ),
  },
];
