import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import type { B2BAccount, B2BInvoice } from "../../domain/types";
import {
  ACCOUNT_TYPE_LABELS,
  B2B_ACCOUNT_STATUSES,
  B2B_INVOICE_STATUSES,
  SETTLEMENT_TERM_LABELS,
} from "./types";

const accountTone = toneMap(B2B_ACCOUNT_STATUSES);
const accountLabel = labelMap(B2B_ACCOUNT_STATUSES);
const invoiceTone = toneMap(B2B_INVOICE_STATUSES);
const invoiceLabel = labelMap(B2B_INVOICE_STATUSES);

/** Credit utilisation bar — the number an account manager checks first. */
function CreditMeter({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-accent" : "bg-primary";
  return (
    <div className="min-w-[7rem]">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="tabular-nums text-ink">{formatCurrency(used, "USD")}</span>
        <span className="tabular-nums text-muted">{pct}%</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-pill bg-surface-muted"
        role="img"
        aria-label={`${pct}% of credit limit used`}
      >
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-xs text-muted">of {formatCurrency(limit, "USD")}</p>
    </div>
  );
}

export const accountColumns: ColumnDef<B2BAccount>[] = [
  {
    accessorKey: "name",
    header: "Account",
    enableHiding: false,
    meta: { label: "Account" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.code} · {ACCOUNT_TYPE_LABELS[row.original.type]} ·{" "}
          {row.original.country}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "contactName",
    header: "Contact",
    meta: { label: "Contact" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.contactName}</p>
        <p className="truncate text-xs text-muted">{row.original.contactEmail}</p>
      </div>
    ),
  },
  {
    accessorKey: "netRateDiscount",
    header: "Net rate",
    meta: { label: "Net rate", align: "right" },
    cell: ({ row }) => (
      <div className="text-right">
        <p className="tabular-nums text-ink">−{row.original.netRateDiscount}%</p>
        <p className="text-xs text-muted">markup {row.original.defaultMarkupRate}%</p>
      </div>
    ),
  },
  {
    accessorKey: "creditUsed",
    header: "Credit used",
    meta: { label: "Credit used" },
    cell: ({ row }) => (
      <CreditMeter used={row.original.creditUsed} limit={row.original.creditLimit} />
    ),
  },
  {
    accessorKey: "settlementTerm",
    header: "Terms",
    meta: { label: "Terms" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {SETTLEMENT_TERM_LABELS[row.original.settlementTerm]}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={accountTone[row.original.status]}>
        {accountLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];

export const invoiceColumns: ColumnDef<B2BInvoice>[] = [
  {
    accessorKey: "number",
    header: "Invoice",
    enableHiding: false,
    meta: { label: "Invoice" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium text-ink">{row.original.number}</p>
        <p className="truncate text-xs text-muted">
          {row.original.bookingIds.length} bookings
        </p>
      </div>
    ),
  },
  {
    accessorKey: "accountName",
    header: "Account",
    meta: { label: "Account" },
    cell: ({ row }) => (
      <span className="truncate text-ink">{row.original.accountName}</span>
    ),
  },
  {
    accessorKey: "netAmount",
    header: "Net",
    meta: { label: "Net", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.netAmount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "markup",
    header: "Markup",
    meta: { label: "Markup", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.markup, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    meta: { label: "Total", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.total, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "balance",
    header: "Balance",
    meta: { label: "Balance", align: "right" },
    cell: ({ row }) => (
      <span
        className={
          row.original.balance > 0
            ? "font-medium tabular-nums text-danger"
            : "tabular-nums text-success"
        }
      >
        {formatCurrency(row.original.balance, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "dueAt",
    header: "Due",
    meta: { label: "Due" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">{formatDate(row.original.dueAt)}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={invoiceTone[row.original.status]}>
        {invoiceLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];
