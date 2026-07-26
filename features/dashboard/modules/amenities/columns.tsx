import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDate } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { AMENITY_STATUSES, type Amenity } from "./types";

const statusTone = toneMap(AMENITY_STATUSES);
const statusLabel = labelMap(AMENITY_STATUSES);

export const amenityColumns: ColumnDef<Amenity>[] = [
  {
    accessorKey: "name",
    header: "Amenity",
    enableHiding: false,
    meta: { label: "Amenity" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate font-mono text-xs text-muted">{row.original.icon}</p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    meta: { label: "Category" },
    cell: ({ row }) => <span className="text-body">{row.original.category}</span>,
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
