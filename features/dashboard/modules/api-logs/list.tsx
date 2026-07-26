"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDateTime, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useApiLogs, useApiSummary } from "./hooks";
import { HTTP_METHODS, STATUS_CLASSES, type ApiLog } from "./types";

const classLabel = labelMap(STATUS_CLASSES);

/** API Logs — KPIs, method + status-class facets, immutable trail with CSV export. */
export function ApiLogsList() {
  const list = useApiLogs();
  const summary = useApiSummary();

  const method = list.filters.method ?? "";
  const statusClass = list.filters.statusClass ?? "";
  const activeFilters: ActiveFilter[] = [
    ...(method ? [{ key: "method", label: `Method: ${method}` }] : []),
    ...(statusClass
      ? [{ key: "statusClass", label: `Status: ${classLabel[statusClass as ApiLog["statusClass"]]}` }]
      : []),
  ];

  const handleExport = () => {
    exportToCsv<ApiLog>("api-logs", list.rows, [
      { header: "When", value: (r) => formatDateTime(r.createdAt) },
      { header: "Method", value: (r) => r.method },
      { header: "Endpoint", value: (r) => r.endpoint },
      { header: "Status", value: (r) => String(r.statusCode) },
      { header: "Latency (ms)", value: (r) => String(r.latencyMs) },
      { header: "Client", value: (r) => r.client },
      { header: "IP", value: (r) => r.ip },
    ]);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Requests" value={formatNumber(summary.data.total)} icon="Server" />
            <StatCard label="Errors" value={formatNumber(summary.data.errors)} icon="TriangleAlert" />
            <StatCard label="Avg latency" value={`${summary.data.avgLatencyMs} ms`} icon="Gauge" />
            <StatCard label="Error rate" value={`${summary.data.errorRate}%`} icon="Activity" />
          </>
        )}
      </div>

      <ResourceListView<ApiLog>
        list={list}
        searchPlaceholder="Search endpoint, client or IP…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <div className="flex items-center gap-2">
            <Select
              aria-label="Filter by method"
              value={method}
              onChange={(e) => list.setFilter("method", e.target.value)}
              options={[{ value: "", label: "All methods" }, ...statusOptions(HTTP_METHODS)]}
              wrapperClassName="w-36"
            />
            <Select
              aria-label="Filter by status class"
              value={statusClass}
              onChange={(e) => list.setFilter("statusClass", e.target.value)}
              options={[{ value: "", label: "All statuses" }, ...statusOptions(STATUS_CLASSES)]}
              wrapperClassName="w-40"
            />
          </div>
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
        caption="API logs"
      />
    </>
  );
}
