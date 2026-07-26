"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDateTime, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useLoginLogs, useLoginSummary } from "./hooks";
import { LOGIN_METHODS, LOGIN_STATUSES, type LoginLog } from "./types";

const statusLabel = labelMap(LOGIN_STATUSES);
const methodLabel = labelMap(LOGIN_METHODS);

/** Login Logs — KPIs, status facet, immutable trail with CSV export. */
export function LoginLogsList() {
  const list = useLoginLogs();
  const summary = useLoginSummary();

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as LoginLog["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<LoginLog>("login-logs", list.rows, [
      { header: "When", value: (r) => formatDateTime(r.createdAt) },
      { header: "User", value: (r) => r.user },
      { header: "Email", value: (r) => r.email },
      { header: "Method", value: (r) => methodLabel[r.method] },
      { header: "Location", value: (r) => r.location },
      { header: "Device", value: (r) => r.device },
      { header: "IP", value: (r) => r.ip },
      { header: "Status", value: (r) => statusLabel[r.status] },
    ]);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Attempts" value={formatNumber(summary.data.total)} icon="Fingerprint" />
            <StatCard label="Failed" value={formatNumber(summary.data.failed)} icon="ShieldAlert" />
            <StatCard label="Blocked" value={formatNumber(summary.data.blocked)} icon="Ban" />
            <StatCard label="Unique users" value={formatNumber(summary.data.uniqueUsers)} icon="Users" />
          </>
        )}
      </div>

      <ResourceListView<LoginLog>
        list={list}
        searchPlaceholder="Search user, email or IP…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(LOGIN_STATUSES)]}
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
        caption="Login logs"
      />
    </>
  );
}
