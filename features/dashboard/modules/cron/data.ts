import type { CronJob, CronResult, CronStatus } from "./types";

/** Fixed epoch so last/next-run timestamps stay stable across reloads. */
const EPOCH = Date.UTC(2026, 6, 20, 9, 0);

function iso(minuteOffset: number): string {
  return new Date(EPOCH + minuteOffset * 60_000).toISOString();
}

type Seed = [
  name: string,
  schedule: string,
  description: string,
  status: CronStatus,
  lastRunAgoMin: number,
  nextRunInMin: number,
  durationMs: number,
  result: CronResult,
];

const SEED: Seed[] = [
  ["Payout settlement", "0 2 * * *", "Batches merchant payouts overnight.", "active", 480, 960, 8420, "success"],
  ["Booking reminders", "*/15 * * * *", "Sends check-in reminders due in the next day.", "active", 8, 7, 640, "success"],
  ["Search reindex", "0 * * * *", "Rebuilds the property search index.", "active", 42, 18, 12300, "success"],
  ["Currency rates", "0 */6 * * *", "Refreshes FX rates from the provider.", "active", 120, 240, 380, "success"],
  ["Abandoned cart sweep", "*/30 * * * *", "Nudges guests who left a booking unpaid.", "active", 12, 18, 910, "success"],
  ["Nightly backup", "30 3 * * *", "Snapshots the primary database.", "active", 540, 900, 45200, "success"],
  ["Report digest", "0 8 * * 1", "Emails the weekly ops digest.", "paused", 8600, 0, 2100, "success"],
  ["Review moderation", "*/10 * * * *", "Scores new reviews for spam.", "failed", 6, 4, 0, "failed"],
  ["Cache warmup", "0 5 * * *", "Pre-fills homepage and search caches.", "active", 240, 1200, 3300, "success"],
  ["Sitemap rebuild", "0 4 * * *", "Regenerates the public sitemap.", "active", 300, 1140, 1750, "success"],
];

export const CRON_SEED: CronJob[] = SEED.map(
  ([name, schedule, description, status, lastAgo, nextIn, durationMs, result], i) => ({
    id: `cron_${100 + i}`,
    name,
    schedule,
    description,
    status,
    lastRun: iso(-lastAgo),
    nextRun: status === "paused" ? "" : iso(nextIn),
    lastDurationMs: durationMs,
    lastResult: result,
  }),
);
