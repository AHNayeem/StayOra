import { Star } from "lucide-react";
import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { TESTIMONIAL_STATUSES, type Testimonial } from "./types";

const statusTone = toneMap(TESTIMONIAL_STATUSES);
const statusLabel = labelMap(TESTIMONIAL_STATUSES);

/** Five-star rating display, filled up to `value`. */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < value
              ? "size-3.5 fill-warning text-warning"
              : "size-3.5 text-line"
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export const testimonialColumns: ColumnDef<Testimonial>[] = [
  {
    accessorKey: "author",
    header: "Author",
    enableHiding: false,
    meta: { label: "Author" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.author}</p>
        <p className="truncate text-xs text-muted">
          {row.original.role}
          {row.original.location ? ` · ${row.original.location}` : ""}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "quote",
    header: "Quote",
    meta: { label: "Quote" },
    cell: ({ row }) => (
      <p className="line-clamp-2 max-w-md text-body">“{row.original.quote}”</p>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    meta: { label: "Rating" },
    cell: ({ row }) => <Stars value={row.original.rating} />,
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
