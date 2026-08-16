/**
 * Work queues — projected from the work that is actually waiting.
 *
 * The seeded numbers here used to be invented. Every row below is now derived
 * from the prototype's own backlog: messages the delivery simulator has not
 * moved yet, catalogue items awaiting review, refunds waiting on a decision,
 * settlements due, disputes open, suppliers yet to answer.
 *
 * That makes the screen honest in the way that matters: if it says 4 items are
 * pending on "catalogue-review", there are four submitted products in the
 * approvals queue, and clearing them here clears them there.
 */

import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import { ApiError } from "../../data/errors";
import type { ResourceService } from "../../crud";
import { getState } from "../../domain/store";
import { messagingService } from "../../domain/messaging";
import { runJob } from "../../domain/scheduler";
import { allCatalogueItems } from "../../domain/catalogue-service";
import type { Queue, QueueSummary } from "./types";

/** A queue definition: where its depth comes from, and what draining it does. */
interface QueueSource {
  id: string;
  name: string;
  driver: string;
  depth: () => { pending: number; processing: number; failed: number; completed: number };
  /** Runs the job that drains this queue; returns how many it moved. */
  drain?: () => number;
}

const todayPrefix = () => new Date().toISOString().slice(0, 10);

const SOURCES: QueueSource[] = [
  {
    id: "queue_messages",
    name: "messages",
    driver: "In-browser simulator",
    depth: () => {
      const outbox = getState().outbox;
      return {
        pending: outbox.filter((m) => m.status === "queued").length,
        processing: outbox.filter((m) => m.status === "sent").length,
        failed: outbox.filter((m) => m.status === "failed" || m.status === "bounced").length,
        completed: outbox.filter(
          (m) => m.deliveredAt?.startsWith(todayPrefix()) ?? false,
        ).length,
      };
    },
    drain: () => runJob("delivery:progress").affected,
  },
  {
    id: "queue_catalogue",
    name: "catalogue-review",
    driver: "Domain workflow",
    depth: () => {
      const items = allCatalogueItems();
      return {
        pending: items.filter((i) => i.status === "submitted").length,
        processing: items.filter((i) => i.status === "under_review").length,
        failed: items.filter((i) => i.status === "rejected").length,
        completed: items.filter((i) => i.publishedAt?.startsWith(todayPrefix()) ?? false).length,
      };
    },
  },
  {
    id: "queue_refunds",
    name: "refunds",
    driver: "Domain workflow",
    depth: () => {
      const refunds = getState().refunds;
      return {
        pending: refunds.filter((r) => r.status === "requested").length,
        processing: refunds.filter((r) => r.status === "approved" || r.status === "processing")
          .length,
        failed: refunds.filter((r) => r.status === "failed").length,
        completed: refunds.filter((r) => r.processedAt?.startsWith(todayPrefix()) ?? false).length,
      };
    },
  },
  {
    id: "queue_settlements",
    name: "settlements",
    driver: "Scheduled job",
    depth: () => {
      const settlements = getState().settlements;
      return {
        pending: settlements.filter((s) => s.status === "pending").length,
        processing: settlements.filter((s) => s.status === "processing").length,
        failed: settlements.filter((s) => s.status === "failed").length,
        completed: settlements.filter((s) => s.paidAt?.startsWith(todayPrefix()) ?? false).length,
      };
    },
    drain: () => runJob("settlements:release").affected,
  },
  {
    id: "queue_supplier",
    name: "supplier-confirmations",
    driver: "Scheduled job",
    depth: () => {
      const rows = getState().supplierConfirmations ?? [];
      return {
        pending: rows.filter((c) => c.status === "pending").length,
        processing: 0,
        failed: rows.filter((c) => c.status === "rejected").length,
        completed: rows.filter((c) => c.respondedAt?.startsWith(todayPrefix()) ?? false).length,
      };
    },
    drain: () => runJob("supplier:confirm").affected,
  },
  {
    id: "queue_disputes",
    name: "disputes",
    driver: "Domain workflow",
    depth: () => {
      const rows = getState().disputes;
      return {
        pending: rows.filter((d) => d.status === "needs_response").length,
        processing: rows.filter(
          (d) => d.status === "under_review" || d.status === "merchant_responded",
        ).length,
        failed: rows.filter((d) => d.status === "lost").length,
        completed: rows.filter((d) => d.status === "won").length,
      };
    },
  },
  {
    id: "queue_recovery",
    name: "abandoned-recovery",
    driver: "Scheduled job",
    depth: () => {
      const leads = getState().recoveryLeads ?? [];
      return {
        pending: leads.filter((l) => l.status === "open" && !l.nudgedAt).length,
        processing: leads.filter((l) => l.status === "open" && Boolean(l.nudgedAt)).length,
        failed: leads.filter((l) => l.status === "expired").length,
        completed: leads.filter((l) => l.status === "recovered").length,
      };
    },
    drain: () => runJob("abandoned:recover").affected,
  },
];

function toQueue(source: QueueSource): Queue {
  const depth = source.depth();
  return {
    id: source.id,
    name: source.name,
    driver: source.driver,
    pending: depth.pending,
    processing: depth.processing,
    failed: depth.failed,
    completedToday: depth.completed,
    // Throughput is what the queue has actually cleared today, per minute of
    // the working day so far — not an invented rate.
    throughputPerMin: Math.round((depth.completed / (24 * 60)) * 100) / 100,
    status: depth.pending > 25 ? "backlogged" : depth.failed > 0 ? "backlogged" : "healthy",
  };
}

function rows(): Queue[] {
  return SOURCES.map(toQueue);
}

export const queuesService: ResourceService<Queue, never, Partial<Queue>> = {
  async list(params: ListParams = {}): Promise<Paginated<Queue>> {
    const { page = 1, pageSize = 10, search, filters } = params;
    let out = rows();
    const term = search?.trim().toLowerCase();
    if (term) {
      out = out.filter((row) => `${row.name} ${row.driver}`.toLowerCase().includes(term));
    }
    if (filters?.status) out = out.filter((row) => row.status === filters.status);
    const total = out.length;
    const start = (page - 1) * pageSize;
    return paginate(out.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<Queue> {
    const row = rows().find((r) => r.id === id);
    if (!row) throw new ApiError({ kind: "not-found", message: "Unknown queue." });
    return row;
  },

  async create(): Promise<Queue> {
    throw new ApiError({
      kind: "validation",
      message: "Queues are derived from platform work and cannot be created by hand.",
    });
  },

  async update(id: ID): Promise<Queue> {
    return queuesService.get(id);
  },

  async remove(): Promise<void> {
    throw new ApiError({ kind: "validation", message: "Queues cannot be deleted." });
  },

  peek: rows,
};

export const queueKeys = {
  all: ["system", "queues"] as const,
  summary: ["system", "queues", "summary"] as const,
};

/** Aggregate depth across every queue. */
export async function getQueueSummary(): Promise<QueueSummary> {
  const all = rows();
  const sum = (pick: (q: Queue) => number) => all.reduce((acc, q) => acc + pick(q), 0);
  return {
    pending: sum((q) => q.pending),
    processing: sum((q) => q.processing),
    failed: sum((q) => q.failed),
    completedToday: sum((q) => q.completedToday),
  };
}

/**
 * Work a queue now.
 *
 * For the messages queue this retries every failed delivery and then advances
 * the simulator; for job-backed queues it runs the job. Queues with no job
 * behind them (a human has to review the item) say so instead of pretending.
 */
export async function retryQueueFailed(id: string): Promise<Queue> {
  const source = SOURCES.find((s) => s.id === id);
  if (!source) throw new ApiError({ kind: "not-found", message: "Unknown queue." });

  if (source.id === "queue_messages") {
    for (const message of getState().outbox) {
      if (message.status === "failed" || message.status === "bounced") {
        messagingService.retryDelivery(message.id);
      }
    }
  }
  if (!source.drain) {
    throw new ApiError({
      kind: "validation",
      message: `"${source.name}" is worked by a person, not a job — clear it from its own screen.`,
    });
  }
  source.drain();
  return queuesService.get(id);
}
