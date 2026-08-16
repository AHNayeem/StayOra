import type { StatusDef } from "../../lib/status";

export const CRON_STATUS_VALUES = ["active", "paused", "failed"] as const;
export type CronStatus = (typeof CRON_STATUS_VALUES)[number];

export const CRON_RESULT_VALUES = ["success", "failed", "running"] as const;
export type CronResult = (typeof CRON_RESULT_VALUES)[number];

/** A scheduled background job and its most recent run. */
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
  status: CronStatus;
  lastRun: string;
  nextRun: string;
  lastDurationMs: number;
  lastResult: CronResult;
  /** What the last run actually changed, e.g. "6 sent, 4 delivered". */
  lastSummary?: string;
  /** Due to run on the next scheduler tick. */
  due?: boolean;
}

export interface CronSummary {
  total: number;
  active: number;
  paused: number;
  failed: number;
  /** Jobs whose next run time has already passed. */
  due: number;
}

export const CRON_STATUSES: readonly StatusDef<CronStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "paused", label: "Paused", tone: "neutral" },
  { value: "failed", label: "Failing", tone: "danger" },
];

export const CRON_RESULTS: readonly StatusDef<CronResult>[] = [
  { value: "success", label: "Success", tone: "success" },
  { value: "failed", label: "Failed", tone: "danger" },
  { value: "running", label: "Running", tone: "info" },
];
