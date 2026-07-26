import { createStubService } from "../../crud";
import { QUEUES_SEED } from "./data";
import type { Queue, QueueSummary } from "./types";

/** Work-queues data source (in-memory stub; repository-ready). */
export const queuesService = createStubService<Queue>({
  seed: QUEUES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "driver"],
  idPrefix: "queue",
});

export const queueKeys = {
  all: ["system", "queues"] as const,
  summary: ["system", "queues", "summary"] as const,
};

/** Aggregate depth across every queue — a seam a real backend can serve live. */
export function getQueueSummary(): Promise<QueueSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = QUEUES_SEED;
      const sum = (pick: (q: Queue) => number) => rows.reduce((acc, q) => acc + pick(q), 0);
      resolve({
        pending: sum((q) => q.pending),
        processing: sum((q) => q.processing),
        failed: sum((q) => q.failed),
        completedToday: sum((q) => q.completedToday),
      });
    }, 300);
  });
}

/** Retry a queue's failed jobs — clears the failed count back to zero. */
export async function retryQueueFailed(id: string): Promise<Queue> {
  return queuesService.update(id, { failed: 0 });
}
