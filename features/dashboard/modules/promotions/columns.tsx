import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { PROMOTION_STATUSES, type Promotion } from "./types";

const statusTone = toneMap(PROMOTION_STATUSES);
const statusLabel = labelMap(PROMOTION_STATUSES);

function discountLabel(promo: Promotion): string {
  return promo.discountType === "percent"
    ? `${promo.value}%`
    : formatCurrency(promo.value, promo.currency);
}

export const promotionColumns: ColumnDef<Promotion>[] = [
  {
    accessorKey: "name",
    header: "Promotion",
    enableHiding: false,
    meta: { label: "Promotion" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate font-mono text-xs text-muted">{row.original.code}</p>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => <span className="text-body">{row.original.type}</span>,
  },
  {
    accessorKey: "value",
    header: "Discount",
    meta: { label: "Discount", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {discountLabel(row.original)}
      </span>
    ),
  },
  {
    accessorKey: "redemptions",
    header: "Redemptions",
    meta: { label: "Redemptions", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.redemptions)}</span>
    ),
  },
  {
    accessorKey: "endsAt",
    header: "Window",
    meta: { label: "Window" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.startsAt)} – {formatDate(row.original.endsAt)}
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
