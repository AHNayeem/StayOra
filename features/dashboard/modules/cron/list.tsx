"use client";

import { useState } from "react";
import { History, Pause, Play, Zap } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import { Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { toast } from "@/lib/toast";
import { useCronJobs, useCronSummary, useRunCronJob, useSetCronStatus } from "./hooks";
import { RunHistoryDrawer } from "./run-history";
import { CRON_STATUSES, type CronJob } from "./types";
import { Alert } from "../../ui";

const statusLabel = labelMap(CRON_STATUSES);

/** Cron Jobs — KPIs, status facet, run-now + pause/resume controls. */
export function CronList() {
  const summary = useCronSummary();
  const run = useRunCronJob();
  const setStatus = useSetCronStatus();
  const [history, setHistory] = useState<CronJob | null>(null);

  const list = useCronJobs((row) => {
    const paused = row.status === "paused";
    return (
      <Can anyPermission={["system:update"]}>
        <RowActions
          label={`Actions for ${row.name}`}
          extra={
            <>
              <DropdownItem
                icon={<Zap />}
                onSelect={() =>
                  void run
                    .mutateAsync(row.id)
                    .then((updated) =>
                      toast.success(`Ran “${row.name}”`, {
                        description: updated.lastSummary,
                      }),
                    )
                }
              >
                Run now
              </DropdownItem>
              <DropdownItem
                icon={paused ? <Play /> : <Pause />}
                onSelect={() =>
                  void setStatus
                    .mutateAsync({ id: row.id, status: paused ? "active" : "paused" })
                    .then(() => toast.success(paused ? "Job resumed" : "Job paused"))
                }
              >
                {paused ? "Resume" : "Pause"}
              </DropdownItem>
              <DropdownItem icon={<History />} onSelect={() => setHistory(row)}>
                Run history
              </DropdownItem>
            </>
          }
        />
      </Can>
    );
  });

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as CronJob["status"]]}` }]
    : [];

  return (
    <>
      <Alert tone="info" title="Simulated scheduler">
        These jobs are real: each one runs against the prototype dataset while the dashboard
        is open, and “Run now” performs the work immediately. There is no server cron — a
        deployment moves the same handlers behind one.
      </Alert>

      <div className="mb-6 mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Jobs" value={formatNumber(summary.data.total)} icon="Clock" />
            <StatCard label="Active" value={formatNumber(summary.data.active)} icon="CircleCheck" />
            <StatCard label="Paused" value={formatNumber(summary.data.paused)} icon="Pause" />
            <StatCard label="Failing" value={formatNumber(summary.data.failed)} icon="CircleAlert" />
          </>
        )}
      </div>

      <ResourceListView<CronJob>
        list={list}
        searchPlaceholder="Search job, schedule or description…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(CRON_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        caption="Cron jobs"
      />

      <RunHistoryDrawer job={history} onClose={() => setHistory(null)} />
    </>
  );
}
