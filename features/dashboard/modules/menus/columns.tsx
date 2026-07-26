import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { MENU_LOCATIONS, type MenuItem } from "./types";

const locationTone = toneMap(MENU_LOCATIONS);
const locationLabel = labelMap(MENU_LOCATIONS);

export const menuColumns: ColumnDef<MenuItem>[] = [
  {
    accessorKey: "order",
    header: "#",
    meta: { label: "Order", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted">{row.original.order + 1}</span>
    ),
  },
  {
    accessorKey: "label",
    header: "Label",
    enableHiding: false,
    meta: { label: "Label" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.label}</p>
        <p className="truncate font-mono text-xs text-muted">{row.original.url}</p>
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    meta: { label: "Location" },
    cell: ({ row }) => (
      <StatusBadge tone={locationTone[row.original.location]}>
        {locationLabel[row.original.location]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "visible",
    header: "Visibility",
    meta: { label: "Visibility" },
    cell: ({ row }) =>
      row.original.visible ? (
        <Tag variant="soft">Visible</Tag>
      ) : (
        <Tag variant="outline">Hidden</Tag>
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
