/**
 * Scheduled-jobs data source — the real scheduler, projected into the row shape
 * this module's table already renders.
 *
 * There is no seed data here any more. Every row is a job that exists in
 * `domain/scheduler.ts` with a handler behind it, so "Run now" performs actual
 * work (progressing message delivery, releasing expired holds, sending recovery
 * nudges) and the run history is what that work did.
 */

import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import type { ResourceService } from "../../crud";
import { ApiError } from "../../data/errors";
import {
  listJobs,
  runJob,
  schedulerSummary,
  setJobStatus,
  type JobRun,
  type JobView,
} from "../../domain/scheduler";
import type { DomainActor } from "../../domain/types";
import type { CronJob, CronSummary } from "./types";

/** One scheduler job as the table row it renders. */
function toRow(job: JobView): CronJob {
  return {
    id: job.key,
    name: job.name,
    schedule: job.schedule,
    description: job.description,
    status: job.lastResult === "failed" ? "failed" : job.status,
    lastRun: job.lastRunAt ?? "",
    nextRun: job.nextRunAt,
    lastDurationMs: job.runs[0]?.durationMs ?? 0,
    lastResult: job.lastResult === "failed" ? "failed" : "success",
    lastSummary: job.runs[0]?.summary,
    due: job.due,
  };
}

function rows(): CronJob[] {
  return listJobs().map(toRow);
}

/** ResourceService over the scheduler. Create/delete are deliberately absent. */
export const cronService: ResourceService<CronJob, never, Partial<CronJob>> = {
  async list(params: ListParams = {}): Promise<Paginated<CronJob>> {
    const { page = 1, pageSize = 10, search, filters, sort } = params;
    let out = rows();

    const term = search?.trim().toLowerCase();
    if (term) {
      out = out.filter((row) =>
        [row.name, row.schedule, row.description].some((v) => v.toLowerCase().includes(term)),
      );
    }
    if (filters?.status) out = out.filter((row) => row.status === filters.status);
    if (sort) {
      const dir = sort.direction === "desc" ? -1 : 1;
      out = [...out].sort(
        (a, b) =>
          String(a[sort.field as keyof CronJob] ?? "").localeCompare(
            String(b[sort.field as keyof CronJob] ?? ""),
            undefined,
            { numeric: true },
          ) * dir,
      );
    }

    const total = out.length;
    const start = (page - 1) * pageSize;
    return paginate(out.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<CronJob> {
    const row = rows().find((r) => r.id === id);
    if (!row) throw new ApiError({ kind: "not-found", message: "That job no longer exists." });
    return row;
  },

  async create(): Promise<CronJob> {
    throw new ApiError({
      kind: "validation",
      message: "Jobs are defined in code — they can be paused, not created.",
    });
  },

  /** The only editable field is the schedule status. */
  async update(id: ID, input: Partial<CronJob>): Promise<CronJob> {
    if (input.status && input.status !== "failed") {
      setJobStatus(String(id), input.status === "paused" ? "paused" : "active");
    }
    return cronService.get(id);
  },

  async remove(): Promise<void> {
    throw new ApiError({
      kind: "validation",
      message: "Jobs are defined in code and cannot be deleted.",
    });
  },

  peek: rows,
};

export const cronKeys = {
  all: ["system", "cron"] as const,
  summary: ["system", "cron", "summary"] as const,
  runs: (id: string) => ["system", "cron", "runs", id] as const,
};

/** Aggregate KPIs — a seam a real backend can serve pre-computed. */
export async function getCronSummary(): Promise<CronSummary> {
  const summary = schedulerSummary();
  return {
    total: summary.total,
    active: summary.active,
    paused: summary.paused,
    failed: summary.failed,
    due: summary.due,
  };
}

/** Trigger a job now — this really runs the handler. */
export async function runCronJob(id: string, actor?: DomainActor): Promise<CronJob> {
  runJob(id, { actor, manual: true });
  return cronService.get(id);
}

/** Run history for one job. */
export function getJobRuns(id: string): JobRun[] {
  return listJobs().find((job) => job.key === id)?.runs ?? [];
}
