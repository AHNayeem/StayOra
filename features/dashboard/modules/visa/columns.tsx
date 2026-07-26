import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { VISA_STATUSES, type Visa } from "./types";

const statusTone = toneMap(VISA_STATUSES);
const statusLabel = labelMap(VISA_STATUSES);

export const visaColumns: ColumnDef<Visa>[] = [
  {
    accessorKey: "country",
    header: "Country",
    enableHiding: false,
    meta: { label: "Country" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.country}</p>
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
    accessorKey: "processingDays",
    header: "Processing",
    meta: { label: "Processing", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.processingDays)} d</span>
    ),
  },
  {
    accessorKey: "fee",
    header: "Fee",
    meta: { label: "Fee", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.fee, row.original.currency)}
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
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.updatedAt)}
      </span>
    ),
  },
];
