import { createStubService } from "../../crud";
import { CRON_SEED } from "./data";
import type { CronJob, CronSummary } from "./types";

/** Scheduled-jobs data source (in-memory stub; repository-ready). */
export const cronService = createStubService<CronJob>({
  seed: CRON_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "schedule", "description"],
  idPrefix: "cron",
});

export const cronKeys = {
  all: ["system", "cron"] as const,
  summary: ["system", "cron", "summary"] as const,
};

/** Aggregate KPIs — a seam a real backend can serve pre-computed. */
export function getCronSummary(): Promise<CronSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = CRON_SEED;
      resolve({
        total: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        paused: rows.filter((r) => r.status === "paused").length,
        failed: rows.filter((r) => r.status === "failed").length,
      });
    }, 300);
  });
}

/**
 * Trigger a job now. Marks it succeeded and stamps `lastRun` — a real backend
 * would enqueue the run and stream the true result back through the same seam.
 */
export async function runCronJob(id: string): Promise<CronJob> {
  return cronService.update(id, {
    lastRun: new Date().toISOString(),
    lastResult: "success",
    status: "active",
  });
}
