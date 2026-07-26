import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { TAX_STATUSES, TAX_TYPES, type TaxRule } from "./types";

const statusTone = toneMap(TAX_STATUSES);
const statusLabel = labelMap(TAX_STATUSES);
const typeLabel = labelMap(TAX_TYPES);

export const taxColumns: ColumnDef<TaxRule>[] = [
  {
    accessorKey: "name",
    header: "Rule",
    enableHiding: false,
    meta: { label: "Rule" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="font-medium text-ink">{row.original.name}</span>
        <p className="truncate text-xs text-muted">{row.original.region}</p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Applies to",
    meta: { label: "Applies to" },
    cell: ({ row }) => <Tag variant="soft">{row.original.category}</Tag>,
  },
  {
    accessorKey: "rate",
    header: "Rate",
    meta: { label: "Rate", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {row.original.rate}%
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => (
      <span className="text-body">{typeLabel[row.original.type]}</span>
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
