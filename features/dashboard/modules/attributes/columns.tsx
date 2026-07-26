import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { ATTRIBUTE_STATUSES, type Attribute } from "./types";

const statusTone = toneMap(ATTRIBUTE_STATUSES);
const statusLabel = labelMap(ATTRIBUTE_STATUSES);

export const attributeColumns: ColumnDef<Attribute>[] = [
  {
    accessorKey: "name",
    header: "Attribute",
    enableHiding: false,
    meta: { label: "Attribute" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.group}</p>
      </div>
    ),
  },
  {
    accessorKey: "inputType",
    header: "Input type",
    meta: { label: "Input type" },
    cell: ({ row }) => (
      <span className="capitalize text-body">{row.original.inputType}</span>
    ),
  },
  {
    accessorKey: "valuesCount",
    header: "Values",
    meta: { label: "Values", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.valuesCount)}</span>
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
