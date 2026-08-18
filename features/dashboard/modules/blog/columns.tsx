import Image from "next/image";
import { Star } from "lucide-react";
import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { BLOG_STATUSES, type BlogPost } from "./types";

const statusTone = toneMap(BLOG_STATUSES);
const statusLabel = labelMap(BLOG_STATUSES);

export const blogColumns: ColumnDef<BlogPost>[] = [
  {
    accessorKey: "title",
    header: "Post",
    enableHiding: false,
    meta: { label: "Post" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-field bg-surface-muted">
          <Image src={row.original.image} alt="" fill sizes="40px" className="object-cover" />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink">{row.original.title}</span>
            {row.original.featured && (
              <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Featured" />
            )}
          </span>
          {/* The slug is the public URL, so it belongs in the list: it is what an
              editor checks when a link doesn't resolve. */}
          <span className="block truncate font-mono text-xs text-muted">
            /blog/{row.original.slug}
          </span>
        </span>
      </div>
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
    accessorKey: "category",
    header: "Category",
    meta: { label: "Category" },
    cell: ({ row }) => (
      <span className="min-w-0">
        <span className="block truncate text-body">{row.original.category}</span>
        {(row.original.tags?.length ?? 0) > 0 && (
          <span className="block truncate text-xs text-muted">
            {row.original.tags?.join(" · ")}
          </span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "author",
    header: "Author",
    meta: { label: "Author" },
    cell: ({ row }) => <span className="whitespace-nowrap text-body">{row.original.author}</span>,
  },
  {
    accessorKey: "publishedAt",
    header: "Published",
    meta: { label: "Published" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {row.original.publishedAt ? (
          formatDate(row.original.publishedAt)
        ) : (
          // A dash rather than a blank cell: "never published" is information.
          <span className="text-muted">—</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">{formatDate(row.original.updatedAt)}</span>
    ),
  },
  {
    id: "readMinutes",
    header: "Length",
    enableSorting: false,
    meta: { label: "Length" },
    cell: ({ row }) => (
      <span className="text-xs whitespace-nowrap text-muted">
        {row.original.readMinutes} min read
      </span>
    ),
  },
];
