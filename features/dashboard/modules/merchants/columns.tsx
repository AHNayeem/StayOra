import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatNumber, formatPercent } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { MERCHANT_STATUSES, type Merchant } from "./types";

const statusTone = toneMap(MERCHANT_STATUSES);
const statusLabel = labelMap(MERCHANT_STATUSES);

export const merchantColumns: ColumnDef<Merchant>[] = [
  {
    accessorKey: "name",
    header: "Merchant",
    enableHiding: false,
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    meta: { label: "Category" },
    cell: ({ row }) => <span className="text-body">{row.original.category}</span>,
  },
  {
    accessorKey: "country",
    header: "Country",
    meta: { label: "Country" },
    cell: ({ row }) => <span className="text-body">{row.original.country}</span>,
  },
  {
    accessorKey: "properties",
    header: "Properties",
    meta: { label: "Properties", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.properties)}</span>
    ),
  },
  {
    accessorKey: "commissionRate",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPercent(row.original.commissionRate)}</span>
    ),
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    meta: { label: "Revenue", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.revenue, row.original.currency)}
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
