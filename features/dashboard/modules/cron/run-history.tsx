"use client";

import { Drawer, StatusBadge } from "../../ui";
import { formatDateTime } from "../../lib/format";
import { getJobRuns } from "./service";
import type { CronJob } from "./types";

/**
 * Run history for one job.
 *
 * Each entry records what the run *changed*, not just that it happened — which
 * is the difference between a simulated scheduler and a decorative one.
 */
export function RunHistoryDrawer({
  job,
  onClose,
}: {
  job: CronJob | null;
  onClose: () => void;
}) {
  const runs = job ? getJobRuns(job.id) : [];

  return (
    <Drawer
      open={Boolean(job)}
      onClose={onClose}
      title={job ? `${job.name} — run history` : ""}
      size="md"
    >
      <p className="mb-4 text-sm text-muted">{job?.description}</p>
      {runs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          This job has not run yet. Use “Run now” to trigger it.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {runs.map((run) => (
            <li
              key={run.id}
              className="rounded-card border border-line bg-surface-muted/40 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink">{formatDateTime(run.at)}</span>
                <StatusBadge tone={run.result === "failed" ? "danger" : "success"}>
                  {run.result === "failed" ? "Failed" : "Success"}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-body">{run.summary}</p>
              <p className="mt-1 text-xs text-muted">
                {run.affected} record{run.affected === 1 ? "" : "s"} affected · {run.durationMs}ms
              </p>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
