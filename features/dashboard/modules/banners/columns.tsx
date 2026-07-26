import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDate, formatNumber, formatPercent } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import {
  BANNER_PLACEMENTS,
  BANNER_STATUSES,
  type Banner,
} from "./types";

const statusTone = toneMap(BANNER_STATUSES);
const statusLabel = labelMap(BANNER_STATUSES);
const placementTone = toneMap(BANNER_PLACEMENTS);
const placementLabel = labelMap(BANNER_PLACEMENTS);

function ctr(banner: Banner): number {
  return banner.impressions === 0 ? 0 : banner.clicks / banner.impressions;
}

export const bannerColumns: ColumnDef<Banner>[] = [
  {
    accessorKey: "title",
    header: "Banner",
    enableHiding: false,
    meta: { label: "Banner" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.title}</p>
        <p className="truncate text-xs text-muted">{row.original.subtitle}</p>
      </div>
    ),
  },
  {
    accessorKey: "placement",
    header: "Placement",
    meta: { label: "Placement" },
    cell: ({ row }) => (
      <StatusBadge tone={placementTone[row.original.placement]}>
        {placementLabel[row.original.placement]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "priority",
    header: "Priority",
    meta: { label: "Priority", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{row.original.priority}</span>
    ),
  },
  {
    accessorKey: "impressions",
    header: "Impressions",
    meta: { label: "Impressions", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.impressions)}</span>
    ),
  },
  {
    id: "ctr",
    accessorFn: (row) => ctr(row),
    header: "CTR",
    meta: { label: "CTR", align: "right" },
    cell: ({ row }) => (
      <Tag>{formatPercent(ctr(row.original))}</Tag>
    ),
  },
  {
    accessorKey: "endsAt",
    header: "Window",
    meta: { label: "Window" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.startsAt)} – {formatDate(row.original.endsAt)}
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
];
