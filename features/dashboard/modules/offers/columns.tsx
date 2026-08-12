import type { ColumnDef } from "../../crud";
import { Badge, StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { comboTotals } from "../../domain/money";
import type { ComboOffer, Offer } from "../../domain/types";
import {
  DISCOUNT_TYPE_LABELS,
  ELIGIBILITY_LABELS,
  OFFER_STATUSES,
  OFFER_TYPE_LABELS,
} from "./types";

const statusTone = toneMap(OFFER_STATUSES);
const statusLabel = labelMap(OFFER_STATUSES);

export const offerColumns: ColumnDef<Offer>[] = [
  {
    accessorKey: "name",
    header: "Offer",
    enableHiding: false,
    meta: { label: "Offer" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Badge size="sm" variant={row.original.scope === "platform" ? "primary" : "neutral"}>
            {row.original.scope === "platform" ? "Platform" : "Merchant"}
          </Badge>
          {OFFER_TYPE_LABELS[row.original.offerType]}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "promoCode",
    header: "Code",
    meta: { label: "Code" },
    cell: ({ row }) =>
      row.original.promoCode ? (
        <code className="rounded-field bg-surface-muted px-2 py-0.5 font-mono text-xs text-ink">
          {row.original.promoCode}
        </code>
      ) : (
        <span className="text-xs text-muted">Automatic</span>
      ),
  },
  {
    accessorKey: "value",
    header: "Discount",
    meta: { label: "Discount", align: "right" },
    cell: ({ row }) => (
      <div className="text-right">
        <p className="font-medium tabular-nums text-ink">
          {row.original.discountType === "percent"
            ? `${row.original.value}%`
            : formatCurrency(row.original.value, "USD")}
        </p>
        <p className="text-xs text-muted">
          {DISCOUNT_TYPE_LABELS[row.original.discountType]}
          {row.original.maxDiscount > 0 &&
            row.original.discountType === "percent" &&
            ` · max ${formatCurrency(row.original.maxDiscount, "USD")}`}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "eligibility",
    header: "Eligibility",
    meta: { label: "Eligibility" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-body">{ELIGIBILITY_LABELS[row.original.eligibility]}</p>
        <p className="truncate text-xs text-muted">
          {row.original.minBookingAmount > 0
            ? `Min ${formatCurrency(row.original.minBookingAmount, "USD")}`
            : "No minimum"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "used",
    header: "Usage",
    meta: { label: "Usage", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {row.original.used}
        {row.original.usageLimit > 0 ? ` / ${row.original.usageLimit}` : ""}
      </span>
    ),
  },
  {
    accessorKey: "endAt",
    header: "Window",
    meta: { label: "Window" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-body">
        {formatDate(row.original.startAt)} → {formatDate(row.original.endAt)}
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
];

export const comboColumns: ColumnDef<ComboOffer>[] = [
  {
    accessorKey: "name",
    header: "Combo",
    enableHiding: false,
    meta: { label: "Combo" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.destination} · {row.original.items.length} products ·{" "}
          {new Set(row.original.items.map((i) => i.merchantId)).size} merchant(s)
        </p>
      </div>
    ),
  },
  {
    accessorKey: "individualTotal",
    header: "Individual",
    meta: { label: "Individual", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted line-through">
        {formatCurrency(comboTotals(row.original).individualTotal, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "comboPrice",
    header: "Combo price",
    meta: { label: "Combo price", align: "right" },
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-ink">
        {formatCurrency(row.original.comboPrice, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "savings",
    header: "Savings",
    meta: { label: "Savings", align: "right" },
    cell: ({ row }) => {
      const t = comboTotals(row.original);
      return (
        <div className="text-right">
          <p className="font-medium tabular-nums text-success">
            {formatCurrency(t.savings, "USD")}
          </p>
          <p className="text-xs text-muted">{t.savingsPercent}% off</p>
        </div>
      );
    },
  },
  {
    accessorKey: "inventory",
    header: "Availability",
    meta: { label: "Availability", align: "right" },
    cell: ({ row }) => {
      const t = comboTotals(row.original);
      return (
        <span className={t.soldOut ? "tabular-nums text-danger" : "tabular-nums text-body"}>
          {t.available} / {row.original.inventory}
        </span>
      );
    },
  },
  {
    accessorKey: "validTo",
    header: "Validity",
    meta: { label: "Validity" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-body">
        {formatDate(row.original.validFrom)} → {formatDate(row.original.validTo)}
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
];
