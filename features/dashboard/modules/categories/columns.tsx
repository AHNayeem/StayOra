import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CATEGORY_STATUSES, type Category } from "./types";

const statusTone = toneMap(CATEGORY_STATUSES);
const statusLabel = labelMap(CATEGORY_STATUSES);

export const categoryColumns: ColumnDef<Category>[] = [
  {
    accessorKey: "name",
    header: "Category",
    enableHiding: false,
    meta: { label: "Category" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate font-mono text-xs text-muted">/{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: "group",
    header: "Group",
    meta: { label: "Group" },
    cell: ({ row }) => <span className="text-body">{row.original.group}</span>,
  },
  {
    accessorKey: "itemsCount",
    header: "Items",
    meta: { label: "Items", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.itemsCount)}</span>
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
