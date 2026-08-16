import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { CRON_STATUSES, type CronJob } from "./types";

const statusTone = toneMap(CRON_STATUSES);
const statusLabel = labelMap(CRON_STATUSES);

/** Human duration from milliseconds — compact (e.g. "8.4s", "620ms"). */
function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const cronColumns: ColumnDef<CronJob>[] = [
  {
    accessorKey: "name",
    header: "Job",
    enableHiding: false,
    meta: { label: "Job" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.description}</p>
      </div>
    ),
  },
  {
    accessorKey: "schedule",
    header: "Schedule",
    meta: { label: "Schedule" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-body">{row.original.schedule}</span>
    ),
  },
  {
    accessorKey: "lastRun",
    header: "Last run",
    meta: { label: "Last run" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="whitespace-nowrap text-body">
          {row.original.lastRun ? formatDateTime(row.original.lastRun) : "Not run yet"}
        </p>
        {/* What the run changed — the number you can go and verify. */}
        <p className="truncate text-xs text-muted">
          {row.original.lastSummary ?? formatDuration(row.original.lastDurationMs)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "nextRun",
    header: "Next run",
    meta: { label: "Next run" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {row.original.nextRun ? formatDateTime(row.original.nextRun) : "—"}
        {row.original.due && <span className="ml-2 text-xs text-accent-600">due</span>}
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
