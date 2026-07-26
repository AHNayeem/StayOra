"use client";

import { Pause, Play, RefreshCw } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import { Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { toast } from "@/lib/toast";
import { useQueues, useQueueSummary, useRetryQueue, useSetQueueStatus } from "./hooks";
import { QUEUE_STATUSES, type Queue } from "./types";

const statusLabel = labelMap(QUEUE_STATUSES);

/** Queues — KPIs, status facet, retry-failed + pause/resume controls. */
export function QueuesList() {
  const summary = useQueueSummary();
  const retry = useRetryQueue();
  const setStatus = useSetQueueStatus();

  const list = useQueues((row) => {
    const paused = row.status === "paused";
    return (
      <Can anyPermission={["system:update"]}>
        <RowActions
          label={`Actions for ${row.name}`}
          extra={
            <>
              <DropdownItem
                icon={<RefreshCw />}
                disabled={row.failed === 0}
                onSelect={() =>
                  void retry
                    .mutateAsync(row.id)
                    .then(() => toast.success(`Retrying failed jobs on “${row.name}”`))
                }
              >
                Retry failed
              </DropdownItem>
              <DropdownItem
                icon={paused ? <Play /> : <Pause />}
                onSelect={() =>
                  void setStatus
                    .mutateAsync({ id: row.id, status: paused ? "healthy" : "paused" })
                    .then(() => toast.success(paused ? "Queue resumed" : "Queue paused"))
                }
              >
                {paused ? "Resume" : "Pause"}
              </DropdownItem>
            </>
          }
        />
      </Can>
    );
  });

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Queue["status"]]}` }]
    : [];

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Pending" value={formatNumber(summary.data.pending)} icon="Layers" />
            <StatCard label="Processing" value={formatNumber(summary.data.processing)} icon="RefreshCw" />
            <StatCard label="Failed" value={formatNumber(summary.data.failed)} icon="TriangleAlert" />
            <StatCard label="Completed today" value={formatNumber(summary.data.completedToday)} icon="CircleCheck" />
          </>
        )}
      </div>

      <ResourceListView<Queue>
        list={list}
        searchPlaceholder="Search queue or driver…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(QUEUE_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        caption="Queues"
      />
    </>
  );
}
