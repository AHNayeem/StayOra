"use client";

import { useResourceList } from "../../crud";
import { useDomainScope } from "../../domain/use-domain";
import type { AuditLogEntry } from "../../domain/types";
import { logColumns } from "./columns";
import { logsService } from "./service";

/**
 * List audit-log entries (most recent first).
 *
 * The platform trail is admin-only: the domain returns nothing for a
 * merchant-scoped caller, so a merchant landing here sees an empty state rather
 * than other tenants' activity.
 */
export function useAuditLogs() {
  const scope = useDomainScope();
  return useResourceList<AuditLogEntry>({
    queryKey: ["logs", scope.merchantId ?? "all"],
    fetcher: (params) => logsService.list(params, scope),
    columns: logColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "at", direction: "desc" },
  });
}
