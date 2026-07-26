"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDateTime } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useAuditLogs } from "./hooks";
import { LOG_STATUSES, type AuditLog } from "./types";

const statusLabel = labelMap(LOG_STATUSES);

/** Audit logs — the immutable activity trail with a status facet and export. */
export function AuditLogsList() {
  const list = useAuditLogs();
  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as AuditLog["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<AuditLog>("audit-logs", list.rows, [
      { header: "When", value: (r) => formatDateTime(r.createdAt) },
      { header: "Actor", value: (r) => r.actor },
      { header: "Action", value: (r) => r.action },
      { header: "Resource", value: (r) => r.resource },
      { header: "Target", value: (r) => r.target },
      { header: "IP", value: (r) => r.ip },
      { header: "Status", value: (r) => statusLabel[r.status] },
    ]);
  };

  return (
    <ResourceListView<AuditLog>
      list={list}
      searchPlaceholder="Search actor, action or target…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(LOG_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can anyPermission={["logs:export"]}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="size-4" />}
            onClick={handleExport}
            disabled={list.rows.length === 0}
          >
            Export CSV
          </Button>
        </Can>
      }
      caption="Audit logs"
    />
  );
}
