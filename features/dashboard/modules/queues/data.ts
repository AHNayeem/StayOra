import type { Queue, QueueStatus } from "./types";

type Seed = [
  name: string,
  driver: string,
  pending: number,
  processing: number,
  failed: number,
  completedToday: number,
  throughputPerMin: number,
  status: QueueStatus,
];

const SEED: Seed[] = [
  ["default", "Redis", 12, 3, 0, 8420, 140, "healthy"],
  ["emails", "Redis", 48, 6, 2, 15300, 220, "healthy"],
  ["notifications", "Redis", 9, 2, 0, 6100, 90, "healthy"],
  ["payments", "SQS", 4, 1, 1, 3200, 45, "healthy"],
  ["search-index", "Redis", 1840, 12, 0, 2100, 60, "backlogged"],
  ["webhooks", "SQS", 22, 4, 7, 4800, 75, "healthy"],
  ["media-processing", "Redis", 320, 8, 3, 940, 20, "backlogged"],
  ["exports", "Redis", 0, 0, 0, 210, 4, "paused"],
];

export const QUEUES_SEED: Queue[] = SEED.map(
  ([name, driver, pending, processing, failed, completedToday, throughputPerMin, status], i) => ({
    id: `queue_${200 + i}`,
    name,
    driver,
    pending,
    processing,
    failed,
    completedToday,
    throughputPerMin,
    status,
  }),
);
