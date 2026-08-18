import Image from "next/image";
import { Star } from "lucide-react";
import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { DESTINATION_STATUSES, type Destination } from "./types";

const statusTone = toneMap(DESTINATION_STATUSES);
const statusLabel = labelMap(DESTINATION_STATUSES);

export const destinationColumns: ColumnDef<Destination>[] = [
  {
    accessorKey: "name",
    header: "Destination",
    enableHiding: false,
    meta: { label: "Destination" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-field bg-surface-muted">
          <Image
            src={row.original.image}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
          />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink">{row.original.name}</span>
            {row.original.featured && (
              <Star
                className="size-3.5 shrink-0 fill-warning text-warning"
                aria-label="Featured"
              />
            )}
          </span>
          {/* The slug is the public URL, so it belongs in the list: it is what an
              editor checks when a link doesn't resolve. */}
          <span className="block truncate font-mono text-xs text-muted">
            /destinations/{row.original.slug}
          </span>
        </span>
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    meta: { label: "Country" },
    cell: ({ row }) => (
      <span className="min-w-0">
        <span className="block truncate text-body">{row.original.country}</span>
        {row.original.region && (
          <span className="block truncate text-xs text-muted">{row.original.region}</span>
        )}
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
    id: "content",
    header: "Content",
    enableSorting: false,
    meta: { label: "Content" },
    cell: ({ row }) => {
      const { gallery = [], attractions = [], activities = [] } = row.original;
      return (
        <span className="text-xs whitespace-nowrap text-muted">
          {gallery.length} photos · {attractions.length} attractions ·{" "}
          {activities.length} activities
        </span>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">{formatDate(row.original.updatedAt)}</span>
    ),
  },
];
