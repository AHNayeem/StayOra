import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_TONES,
  type Dispute,
} from "@/features/dashboard/domain";

const statusTone = DISPUTE_STATUS_TONES;
const statusLabel = DISPUTE_STATUS_LABELS;
const reasonLabel = DISPUTE_REASON_LABELS;

export const disputeColumns: ColumnDef<Dispute>[] = [
  {
    accessorKey: "reference",
    header: "Case",
    enableHiding: false,
    meta: { label: "Case" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="font-medium text-ink">{row.original.reference}</span>
        <p className="truncate text-xs text-muted">{row.original.bookingRef}</p>
      </div>
    ),
  },
  {
    accessorKey: "merchantName",
    header: "Merchant",
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-ink">{row.original.merchantName}</p>
        <p className="truncate text-xs text-muted">{row.original.customerName}</p>
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    meta: { label: "Reason" },
    cell: ({ row }) => <Tag variant="soft">{reasonLabel[row.original.reason]}</Tag>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { label: "Amount", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.amount, row.original.currency)}
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
    accessorKey: "dueAt",
    header: "Respond by",
    meta: { label: "Respond by" },
    cell: ({ row }) => {
      const open = row.original.status === "needs_response";
      return (
        <span
          className={`whitespace-nowrap ${open ? "font-medium text-danger" : "text-body"}`}
        >
          {formatDate(row.original.dueAt)}
        </span>
      );
    },
  },
];
