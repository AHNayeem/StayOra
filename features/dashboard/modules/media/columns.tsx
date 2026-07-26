import type { ColumnDef } from "../../crud";
import { Tag } from "../../ui";
import { DashboardIcon } from "../../navigation/dashboard-icons";
import { formatDate } from "../../lib/format";
import { labelMap } from "../../lib/status";
import { MEDIA_TYPES, type MediaAsset, type MediaType } from "./types";

const typeLabel = labelMap(MEDIA_TYPES);

/** Human-readable byte size (KB/MB) — shared by the list and CSV export. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Icon glyph per media type, shown in the thumbnail tile. */
const TYPE_ICON: Record<MediaType, string> = {
  image: "Image",
  video: "LayoutPanelTop",
  document: "Receipt",
  audio: "MessageSquare",
};

export const mediaColumns: ColumnDef<MediaAsset>[] = [
  {
    accessorKey: "name",
    header: "Asset",
    enableHiding: false,
    meta: { label: "Asset" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface-muted text-muted">
          <DashboardIcon name={TYPE_ICON[row.original.type]} className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.name}</p>
          <p className="truncate font-mono text-xs text-muted">/{row.original.folder}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => <Tag variant="soft">{typeLabel[row.original.type]}</Tag>,
  },
  {
    accessorKey: "dimensions",
    header: "Dimensions",
    meta: { label: "Dimensions" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {row.original.dimensions || "—"}
      </span>
    ),
  },
  {
    accessorKey: "size",
    header: "Size",
    meta: { label: "Size", align: "right" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums text-body">
        {formatBytes(row.original.size)}
      </span>
    ),
  },
  {
    accessorKey: "uploadedBy",
    header: "Uploaded by",
    meta: { label: "Uploaded by" },
    cell: ({ row }) => <span className="text-body">{row.original.uploadedBy}</span>,
  },
  {
    accessorKey: "uploadedAt",
    header: "Uploaded",
    meta: { label: "Uploaded" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.uploadedAt)}
      </span>
    ),
  },
];
