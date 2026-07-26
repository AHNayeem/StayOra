"use client";

import { useResourceList } from "../../crud";
import { logColumns } from "./columns";
import { logKeys, logsService } from "./service";
import type { AuditLog } from "./types";

/** List audit-log entries (most recent first). */
export function useAuditLogs() {
  return useResourceList<AuditLog>({
    queryKey: logKeys.all,
    fetcher: (params, signal) => logsService.list(params, signal),
    columns: logColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}
