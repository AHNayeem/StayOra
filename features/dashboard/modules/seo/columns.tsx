import type { ColumnDef } from "../../crud";
import { Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { SEO_TITLE_MAX, type SeoEntry } from "./types";

export const seoColumns: ColumnDef<SeoEntry>[] = [
  {
    accessorKey: "path",
    header: "Route",
    enableHiding: false,
    meta: { label: "Route" },
    cell: ({ row }) => (
      <span className="font-mono text-sm text-ink">{row.original.path}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    meta: { label: "Title" },
    cell: ({ row }) => {
      const len = row.original.title.length;
      const over = len > SEO_TITLE_MAX;
      return (
        <div className="min-w-0 max-w-md">
          <p className="truncate text-body">{row.original.title}</p>
          <p className={over ? "text-xs text-warning" : "text-xs text-muted"}>
            {len} chars{over ? " · long" : ""}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "indexable",
    header: "Indexing",
    meta: { label: "Indexing" },
    cell: ({ row }) =>
      row.original.indexable ? (
        <Tag variant="soft">Indexed</Tag>
      ) : (
        <Tag variant="outline">No-index</Tag>
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
