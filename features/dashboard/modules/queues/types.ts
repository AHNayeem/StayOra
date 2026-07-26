import type { StatusDef } from "../../lib/status";

export const QUEUE_STATUS_VALUES = ["healthy", "backlogged", "paused"] as const;
export type QueueStatus = (typeof QUEUE_STATUS_VALUES)[number];

/** A background work queue and its live depth. */
export interface Queue {
  id: string;
  name: string;
  driver: string;
  pending: number;
  processing: number;
  failed: number;
  completedToday: number;
  throughputPerMin: number;
  status: QueueStatus;
}

export interface QueueSummary {
  pending: number;
  processing: number;
  failed: number;
  completedToday: number;
}

export const QUEUE_STATUSES: readonly StatusDef<QueueStatus>[] = [
  { value: "healthy", label: "Healthy", tone: "success" },
  { value: "backlogged", label: "Backlogged", tone: "warning" },
  { value: "paused", label: "Paused", tone: "neutral" },
];
