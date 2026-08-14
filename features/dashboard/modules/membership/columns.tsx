import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  MEMBERSHIP_STATUS_LABELS,
  PERIOD_LABELS,
  type MembershipSubscription,
} from "../../domain/membership";

const STATUS_TONES = {
  active: "success",
  cancelled: "neutral",
  expired: "warning",
} as const;

export const subscriptionColumns: ColumnDef<MembershipSubscription>[] = [
  {
    accessorKey: "customerName",
    header: "Member",
    enableHiding: false,
    meta: { label: "Member" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.customerName}</p>
        <p className="truncate text-xs text-muted">{row.original.customerEmail}</p>
      </div>
    ),
  },
  {
    accessorKey: "planName",
    header: "Plan",
    meta: { label: "Plan" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <Badge size="sm" variant={row.original.planCode === "premium" ? "accent" : "neutral"}>
          {row.original.planName}
        </Badge>
        <p className="mt-1 text-xs text-muted">
          {formatCurrency(row.original.price, row.original.currency)}{" "}
          {PERIOD_LABELS[row.original.billingPeriod]}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "startAt",
    header: "Started",
    meta: { label: "Started" },
    cell: ({ row }) => (
      <span className="text-xs text-body">{formatDate(row.original.startAt)}</span>
    ),
  },
  {
    accessorKey: "renewsAt",
    header: "Renews / expires",
    meta: { label: "Renews / expires" },
    cell: ({ row }) => (
      <div className="text-xs">
        <p className="text-body">{formatDate(row.original.renewsAt)}</p>
        <p className="text-muted">
          {row.original.autoRenew ? "Auto-renew on" : "Auto-renew off"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "lifetimeRevenue",
    header: "Revenue",
    meta: { label: "Revenue", align: "right" },
    cell: ({ row }) => (
      <div className="text-right">
        <p className="font-semibold tabular-nums text-ink">
          {formatCurrency(row.original.lifetimeRevenue, row.original.currency)}
        </p>
        <p className="text-xs text-muted">
          {row.original.periodsBilled} period{row.original.periodsBilled === 1 ? "" : "s"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={STATUS_TONES[row.original.status]}>
        {MEMBERSHIP_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
];
