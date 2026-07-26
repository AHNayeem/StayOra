import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { DashboardIcon } from "../../navigation/dashboard-icons";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CHANNEL_ICON, TEMPLATE_CHANNELS, type NotificationTemplate } from "./types";

const channelTone = toneMap(TEMPLATE_CHANNELS);
const channelLabel = labelMap(TEMPLATE_CHANNELS);

export const templateColumns: ColumnDef<NotificationTemplate>[] = [
  {
    accessorKey: "name",
    header: "Template",
    enableHiding: false,
    meta: { label: "Template" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface-muted text-muted">
          <DashboardIcon name={CHANNEL_ICON[row.original.channel]} className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.name}</p>
          <p className="truncate font-mono text-xs text-muted">{row.original.key}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "channel",
    header: "Channel",
    meta: { label: "Channel" },
    cell: ({ row }) => (
      <StatusBadge tone={channelTone[row.original.channel]}>
        {channelLabel[row.original.channel]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "subject",
    header: "Subject / preview",
    meta: { label: "Subject / preview" },
    cell: ({ row }) => (
      <p className="max-w-md truncate text-body">
        {row.original.subject || row.original.body.split("\n")[0]}
      </p>
    ),
  },
  {
    accessorKey: "enabled",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) =>
      row.original.enabled ? (
        <Tag variant="soft">Active</Tag>
      ) : (
        <Tag variant="outline">Off</Tag>
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
