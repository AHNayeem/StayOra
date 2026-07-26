import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { SHARED_ROOM_STATUSES, type SharedRoom } from "./types";

const statusTone = toneMap(SHARED_ROOM_STATUSES);
const statusLabel = labelMap(SHARED_ROOM_STATUSES);

export const sharedRoomColumns: ColumnDef<SharedRoom>[] = [
  {
    accessorKey: "name",
    header: "Property",
    enableHiding: false,
    meta: { label: "Property" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.city}, {row.original.country}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "beds",
    header: "Beds",
    meta: { label: "Beds", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.beds)}</span>
    ),
  },
  {
    accessorKey: "pricePerBed",
    header: "Price / bed",
    meta: { label: "Price / bed", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.pricePerBed, row.original.currency)}
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
