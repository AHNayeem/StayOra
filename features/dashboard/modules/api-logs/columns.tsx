import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDateTime } from "../../lib/format";
import { toneMap } from "../../lib/status";
import { HTTP_METHODS, STATUS_CLASSES, type ApiLog } from "./types";

const methodTone = toneMap(HTTP_METHODS);
const classTone = toneMap(STATUS_CLASSES);

export const apiLogColumns: ColumnDef<ApiLog>[] = [
  {
    accessorKey: "createdAt",
    header: "When",
    enableHiding: false,
    meta: { label: "When" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDateTime(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "endpoint",
    header: "Request",
    meta: { label: "Request" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <StatusBadge tone={methodTone[row.original.method]}>{row.original.method}</StatusBadge>
        <span className="truncate font-mono text-xs text-body">{row.original.endpoint}</span>
      </div>
    ),
  },
  {
    accessorKey: "statusCode",
    header: "Status",
    meta: { label: "Status", align: "right" },
    cell: ({ row }) => (
      <StatusBadge tone={classTone[row.original.statusClass]}>
        {row.original.statusCode}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "latencyMs",
    header: "Latency",
    meta: { label: "Latency", align: "right" },
    cell: ({ row }) => {
      const ms = row.original.latencyMs;
      const slow = ms >= 250;
      return (
        <span className={slow ? "tabular-nums text-warning" : "tabular-nums text-body"}>
          {ms} ms
        </span>
      );
    },
  },
  {
    accessorKey: "client",
    header: "Client",
    meta: { label: "Client" },
    cell: ({ row }) => <Tag>{row.original.client}</Tag>,
  },
  {
    accessorKey: "ip",
    header: "IP address",
    meta: { label: "IP address" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-body">{row.original.ip}</span>
    ),
  },
];
