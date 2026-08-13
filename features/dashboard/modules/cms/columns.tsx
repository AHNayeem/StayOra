import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate, formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CMS_STATUSES, type CmsPage } from "./types";

const statusTone = toneMap(CMS_STATUSES);
const statusLabel = labelMap(CMS_STATUSES);

export const cmsColumns: ColumnDef<CmsPage>[] = [
  {
    accessorKey: "title",
    header: "Title",
    enableHiding: false,
    meta: { label: "Title" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.title}</p>
        <p className="truncate font-mono text-xs text-muted">/{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => <span className="text-body">{row.original.type}</span>,
  },
  {
    accessorKey: "author",
    header: "Author",
    meta: { label: "Author" },
    cell: ({ row }) => <span className="text-body">{row.original.author}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-0.5">
        <StatusBadge tone={statusTone[row.original.status]}>
          {statusLabel[row.original.status]}
        </StatusBadge>
        {row.original.status === "scheduled" && row.original.publishAt && (
          <span className="whitespace-nowrap text-xs text-muted">
            Goes live {formatDateTime(row.original.publishAt)}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "version",
    header: "Version",
    meta: { label: "Version", align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted">v{row.original.version}</span>
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
