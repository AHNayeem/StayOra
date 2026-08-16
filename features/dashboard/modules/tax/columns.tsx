import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import {
  TAX_BASIS_LABELS,
  TAX_STATUSES,
  TAX_TYPES,
  isPercentageBasis,
  jurisdictionLabel,
  type TaxRule,
} from "./types";

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
        <p className="truncate text-xs text-muted">
          {jurisdictionLabel(row.original.region)}
        </p>
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
    header: "Charge",
    meta: { label: "Charge", align: "right" },
    cell: ({ row }) => {
      const rule = row.original;
      return (
        <div className="text-right">
          <span className="font-medium tabular-nums text-ink">
            {isPercentageBasis(rule.basis)
              ? `${rule.rate}%`
              : `$${rule.amount.toFixed(2)}`}
          </span>
          <p className="text-xs text-muted">{TAX_BASIS_LABELS[rule.basis]}</p>
        </div>
      );
    },
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
