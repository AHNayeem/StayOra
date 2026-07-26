import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { RECONCILIATION_STATUSES, type ReconciliationBatch } from "./types";

const statusTone = toneMap(RECONCILIATION_STATUSES);
const statusLabel = labelMap(RECONCILIATION_STATUSES);

export const reconciliationColumns: ColumnDef<ReconciliationBatch>[] = [
  {
    accessorKey: "reference",
    header: "Batch",
    enableHiding: false,
    meta: { label: "Batch" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="font-medium text-ink">{row.original.reference}</span>
        <p className="truncate text-xs text-muted">{row.original.period}</p>
      </div>
    ),
  },
  {
    accessorKey: "gateway",
    header: "Gateway",
    meta: { label: "Gateway" },
    cell: ({ row }) => <Tag variant="outline">{row.original.gateway}</Tag>,
  },
  {
    accessorKey: "expected",
    header: "Expected",
    meta: { label: "Expected", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.expected, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "settled",
    header: "Settled",
    meta: { label: "Settled", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">
        {formatCurrency(row.original.settled, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "variance",
    header: "Variance",
    meta: { label: "Variance", align: "right" },
    cell: ({ row }) => {
      const v = row.original.variance;
      return (
        <span
          className={`font-medium tabular-nums ${
            v === 0 ? "text-muted" : "text-danger"
          }`}
        >
          {v > 0 ? "+" : ""}
          {formatCurrency(v, row.original.currency)}
        </span>
      );
    },
  },
  {
    accessorKey: "unmatched",
    header: "Unmatched",
    meta: { label: "Unmatched", align: "right" },
    cell: ({ row }) => (
      <span
        className={`tabular-nums ${
          row.original.unmatched > 0 ? "text-danger" : "text-muted"
        }`}
      >
        {row.original.unmatched}
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
    accessorKey: "runAt",
    header: "Run",
    meta: { label: "Run" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.runAt)}
      </span>
    ),
  },
];
