import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "../../lib/format";
import {
  CAMPAIGN_STATUS_LABELS,
  PLACEMENT_LABELS,
  campaignPerformance,
  type AdCampaign,
} from "../../domain/advertising";

const STATUS_TONES = {
  draft: "neutral",
  pending_review: "warning",
  scheduled: "info",
  active: "success",
  paused: "warning",
  completed: "neutral",
  rejected: "danger",
} as const;

const MODEL_SHORT: Record<AdCampaign["pricingModel"], string> = {
  cpc: "CPC",
  cpm: "CPM",
  flat: "Flat",
  cpa: "CPA",
};

export const campaignColumns: ColumnDef<AdCampaign>[] = [
  {
    accessorKey: "name",
    header: "Campaign",
    enableHiding: false,
    meta: { label: "Campaign" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.reference} · {row.original.advertiserName}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "placement",
    header: "Placement",
    meta: { label: "Placement" },
    cell: ({ row }) => (
      <span className="text-sm text-body">{PLACEMENT_LABELS[row.original.placement]}</span>
    ),
  },
  {
    accessorKey: "pricingModel",
    header: "Pricing",
    meta: { label: "Pricing" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <Badge size="sm" variant="neutral">
          {MODEL_SHORT[row.original.pricingModel]}
        </Badge>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {row.original.pricingModel === "cpa"
            ? `${row.original.rate}%`
            : formatCurrency(row.original.rate, row.original.currency)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "metrics",
    header: "Delivery",
    meta: { label: "Delivery" },
    cell: ({ row }) => {
      const perf = campaignPerformance(row.original);
      return (
        <div className="text-xs text-muted">
          <p>
            {formatNumber(row.original.metrics.impressions)} impr ·{" "}
            {formatNumber(row.original.metrics.clicks)} clicks
          </p>
          <p>
            CTR {formatPercent(perf.ctr)} · {formatNumber(row.original.metrics.conversions)}{" "}
            bookings
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "budget",
    header: "Spend / budget",
    meta: { label: "Spend / budget", align: "right" },
    cell: ({ row }) => {
      const perf = campaignPerformance(row.original);
      return (
        <div className="text-right">
          <p className="font-semibold tabular-nums text-ink">
            {formatCurrency(perf.spend, row.original.currency)}
          </p>
          <p className="text-xs tabular-nums text-muted">
            of {formatCurrency(row.original.budget, row.original.currency)} (
            {perf.budgetUsed.toFixed(0)}%)
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "billed",
    header: "Billed",
    meta: { label: "Billed", align: "right" },
    cell: ({ row }) => {
      const perf = campaignPerformance(row.original);
      return (
        <div className="text-right">
          <p className="tabular-nums text-body">
            {formatCurrency(row.original.billed, row.original.currency)}
          </p>
          {perf.unbilled > 0 && (
            <p className="text-xs tabular-nums text-warning">
              {formatCurrency(perf.unbilled, row.original.currency)} unbilled
            </p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "endAt",
    header: "Window",
    meta: { label: "Window" },
    cell: ({ row }) => (
      <div className="text-xs text-muted">
        <p>{formatDate(row.original.startAt)}</p>
        <p>→ {formatDate(row.original.endAt)}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={STATUS_TONES[row.original.status]}>
        {CAMPAIGN_STATUS_LABELS[row.original.status]}
      </StatusBadge>
    ),
  },
];
