import { Star } from "lucide-react";
import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { REVIEW_STATUSES, type Review } from "./types";

const statusTone = toneMap(REVIEW_STATUSES);
const statusLabel = labelMap(REVIEW_STATUSES);

export const reviewColumns: ColumnDef<Review>[] = [
  {
    accessorKey: "property",
    header: "Review",
    enableHiding: false,
    meta: { label: "Review" },
    cell: ({ row }) => (
      <div className="min-w-0 max-w-md">
        <p className="truncate font-medium text-ink">{row.original.title}</p>
        <p className="truncate text-xs text-muted">
          {row.original.property} · {row.original.guest}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    meta: { label: "Rating", align: "right" },
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Star className="size-3.5 fill-accent text-accent" aria-hidden="true" />
        {row.original.rating}
      </span>
    ),
  },
  {
    accessorKey: "comment",
    header: "Comment",
    meta: { label: "Comment" },
    cell: ({ row }) => (
      <p className="max-w-sm truncate text-body">{row.original.comment}</p>
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
    accessorKey: "createdAt",
    header: "Date",
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
];
