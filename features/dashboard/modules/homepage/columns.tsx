import type { ColumnDef } from "../../crud";
import { Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap } from "../../lib/status";
import { BLOCK_KINDS, type HomeBlock } from "./types";

const kindLabel = labelMap(BLOCK_KINDS);

export const homepageColumns: ColumnDef<HomeBlock>[] = [
  {
    accessorKey: "order",
    header: "#",
    meta: { label: "Order", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted">{row.original.order + 1}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Section",
    enableHiding: false,
    meta: { label: "Section" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.description}</p>
      </div>
    ),
  },
  {
    accessorKey: "kind",
    header: "Type",
    meta: { label: "Type" },
    cell: ({ row }) => <Tag variant="soft">{kindLabel[row.original.kind]}</Tag>,
  },
  {
    accessorKey: "enabled",
    header: "State",
    meta: { label: "State" },
    cell: ({ row }) =>
      row.original.enabled ? (
        <Tag variant="soft">Enabled</Tag>
      ) : (
        <Tag variant="outline">Disabled</Tag>
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
