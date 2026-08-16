/**
 * The scheduler — jobs that actually do something.
 *
 * The Cron screen used to list plausible job names against invented run counts.
 * Nothing ran. This file is the missing half: a registry of jobs, each bound to
 * a real domain effect, with run history, due-time tracking and a tick the
 * dashboard drives while it is open.
 *
 *   delivery:progress      queued → sent → delivered on the message outbox
 *   holds:sweep            release inventory from abandoned checkouts
 *   abandoned:recover      nudge travellers who left a booking unpaid
 *   reviews:invite         invite reviews after a completed stay
 *   waitlist:notify        tell waitlisted travellers when dates free up
 *   supplier:confirm       resolve pending supplier confirmations
 *   settlements:release    move due settlements along the payout track
 *   fx:refresh             re-quote the rate board
 *   calendar:sync          pull external channel calendars into availability
 *   alerts:price           re-run saved searches and notify on a price drop
 *   membership:renew       bill due memberships, with dunning on a decline
 *   split:chase            chase unpaid shares of a group booking
 *
 * Every run appends a {@link JobRun} with what it actually changed, so "12
 * bookings recovered" on the Cron screen is a number you can go and verify in
 * the bookings table. A real deployment replaces the tick with a server cron and
 * keeps the handlers.
 */

import { getState, mutate } from "./store";
import { advanceDeliveries } from "./messaging";
import { sweepExpiredHolds } from "./inventory";
import { SYSTEM_ACTOR, delay, recordAudit } from "./service-kit";
import type { DomainActor } from "./types";
import { fxRateBoard } from "./fx";
import { sweepAbandonedCheckouts } from "./recovery";
import { sweepReviewInvitations } from "./review-invitations";
import { sweepWaitlist } from "./waitlist";
import { sweepSupplierConfirmations } from "./supplier";
import { sweepDueSettlements } from "./settlement-sweep";
import { sweepScheduledCampaigns } from "./campaigns";
import { sweepCalendarSync } from "./calendar-sync";
import { sweepPriceAlerts } from "./saved-searches";
import { sweepMembershipRenewals } from "./membership-billing";
import { sweepSplitPayments } from "./split-payment";

export type JobStatus = "active" | "paused";
export type JobResult = "success" | "failed" | "skipped";

export interface JobRun {
  id: string;
  at: string;
  result: JobResult;
  /** What the run changed — the number the Cron screen shows. */
  affected: number;
  summary: string;
  durationMs: number;
}

/** A job's stored state. Definitions are code; this is what moves. */
export interface JobState {
  key: string;
  status: JobStatus;
  lastRunAt?: string;
  lastResult?: JobResult;
  nextRunAt: string;
  runs: JobRun[];
}

export interface JobOutcome {
  affected: number;
  summary: string;
}

export interface JobDefinition {
  key: string;
  name: string;
  description: string;
  /** Human cron expression, for display. */
  schedule: string;
  /** How often the tick considers it due. */
  everyMinutes: number;
  /** The work. Returns what it changed. */
  run: (nowMs: number) => JobOutcome;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const JOBS: JobDefinition[] = [
  {
    key: "delivery:progress",
    name: "Message delivery",
    description: "Moves queued messages through the simulated provider to sent and delivered.",
    schedule: "* * * * *",
    everyMinutes: 1,
    run: (now) => {
      const result = advanceDeliveries(now);
      const affected = result.sent + result.delivered + result.failed;
      return {
        affected,
        summary: affected
          ? `${result.sent} sent, ${result.delivered} delivered, ${result.failed} failed`
          : "Nothing queued",
      };
    },
  },
  {
    key: "holds:sweep",
    name: "Inventory hold sweep",
    description: "Releases units held by checkouts that were abandoned or timed out.",
    schedule: "*/5 * * * *",
    everyMinutes: 5,
    run: (now) => {
      const before = getState().holds.filter((h) => h.status === "held").length;
      sweepExpiredHolds(now);
      const after = getState().holds.filter((h) => h.status === "held").length;
      const affected = Math.max(0, before - after);
      return {
        affected,
        summary: affected ? `${affected} hold(s) expired and released` : "No expired holds",
      };
    },
  },
  {
    key: "abandoned:recover",
    name: "Abandoned checkout recovery",
    description: "Nudges travellers who left a booking unpaid, with a link back to their dates.",
    schedule: "*/30 * * * *",
    everyMinutes: 30,
    run: (now) => sweepAbandonedCheckouts(now),
  },
  {
    key: "reviews:invite",
    name: "Review invitations",
    description: "Invites a review once a stay has completed and none has been left.",
    schedule: "0 9 * * *",
    everyMinutes: 240,
    run: (now) => sweepReviewInvitations(now),
  },
  {
    key: "waitlist:notify",
    name: "Waitlist notifications",
    description: "Tells waitlisted travellers when their dates come back into inventory.",
    schedule: "*/15 * * * *",
    everyMinutes: 15,
    run: (now) => sweepWaitlist(now),
  },
  {
    key: "supplier:confirm",
    name: "Supplier confirmations",
    description: "Resolves bookings waiting on the supplier to accept or reject.",
    schedule: "*/10 * * * *",
    everyMinutes: 10,
    run: (now) => sweepSupplierConfirmations(now),
  },
  {
    key: "settlements:release",
    name: "Settlement release",
    description: "Moves settlements whose scheduled date has passed to the next payout state.",
    schedule: "0 2 * * *",
    everyMinutes: 360,
    run: (now) => sweepDueSettlements(now),
  },
  {
    key: "campaigns:send",
    name: "Scheduled campaigns",
    description: "Sends marketing campaigns whose scheduled time has arrived.",
    schedule: "*/5 * * * *",
    everyMinutes: 5,
    run: (now) => sweepScheduledCampaigns(now),
  },
  {
    key: "fx:refresh",
    name: "FX rate refresh",
    description: "Re-quotes the rate board so new checkouts lock a fresh rate.",
    schedule: "0 * * * *",
    everyMinutes: 60,
    run: () => {
      const board = fxRateBoard();
      return { affected: board.length, summary: `${board.length} currencies re-quoted` };
    },
  },
  {
    key: "split:chase",
    name: "Split payment chasing",
    description:
      "Reminds people who haven't paid their share of a group booking, and closes the window when it passes.",
    schedule: "0 */6 * * *",
    everyMinutes: 360,
    run: (now) => sweepSplitPayments(now),
  },
  {
    key: "membership:renew",
    name: "Membership renewals",
    description:
      "Bills memberships whose period has ended, and retries the ones whose charge was declined.",
    schedule: "0 3 * * *",
    everyMinutes: 360,
    run: (now) => sweepMembershipRenewals(now),
  },
  {
    key: "alerts:price",
    name: "Price alerts",
    description:
      "Re-runs saved searches and writes to travellers whose target price has been met.",
    schedule: "*/20 * * * *",
    everyMinutes: 20,
    run: (now) => sweepPriceAlerts(now),
  },
  {
    key: "calendar:sync",
    name: "External calendar sync",
    description:
      "Pulls each connected property's channel calendar and blocks the nights other channels have sold.",
    schedule: "0 * * * *",
    everyMinutes: 60,
    run: (now) => {
      const result = sweepCalendarSync(now);
      const affected = result.synced + result.failed;
      return {
        affected,
        summary: affected
          ? `${result.synced} propert${result.synced === 1 ? "y" : "ies"} synced (${result.blocks} blocked nights)${
              result.failed ? `, ${result.failed} failed` : ""
            }`
          : "No connection due",
      };
    },
  },
];

export function findJob(key: string): JobDefinition | undefined {
  return JOBS.find((job) => job.key === key);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const MAX_RUNS = 20;

function defaultState(job: JobDefinition, nowMs: number): JobState {
  return {
    key: job.key,
    status: "active",
    nextRunAt: new Date(nowMs + job.everyMinutes * 60_000).toISOString(),
    runs: [],
  };
}

/** State for one job, created on first access. */
export function jobState(key: string, nowMs = Date.now()): JobState {
  const job = findJob(key);
  if (!job) throw new Error(`Unknown job: ${key}`);
  const existing = getState().scheduledJobs?.find((s) => s.key === key);
  if (existing) return existing;
  const created = defaultState(job, nowMs);
  mutate((draft) => {
    draft.scheduledJobs ??= [];
    draft.scheduledJobs.push(created);
  });
  return created;
}

export interface JobView extends JobDefinition, Omit<JobState, "key"> {
  /** Convenience for the list: is it due right now? */
  due: boolean;
}

/** Every job with its current state — what the Cron screen lists. */
export function listJobs(nowMs = Date.now()): JobView[] {
  return JOBS.map((job) => {
    const state = jobState(job.key, nowMs);
    return {
      ...job,
      status: state.status,
      lastRunAt: state.lastRunAt,
      lastResult: state.lastResult,
      nextRunAt: state.nextRunAt,
      runs: state.runs,
      due: state.status === "active" && new Date(state.nextRunAt).getTime() <= nowMs,
    };
  });
}

/**
 * Run one job now.
 *
 * A paused job still runs when triggered by hand — that is what "Run now" means
 * to an operator — but its schedule stays paused.
 */
export function runJob(
  key: string,
  options: { actor?: DomainActor; nowMs?: number; manual?: boolean } = {},
): JobRun {
  const { actor = SYSTEM_ACTOR, nowMs = Date.now(), manual = false } = options;
  const job = findJob(key);
  if (!job) throw new Error(`Unknown job: ${key}`);
  jobState(key, nowMs);

  const started = nowMs;
  let outcome: JobOutcome;
  let result: JobResult = "success";
  try {
    outcome = job.run(nowMs);
  } catch (error) {
    result = "failed";
    outcome = {
      affected: 0,
      summary: error instanceof Error ? error.message : "Job failed",
    };
  }

  const run: JobRun = {
    id: `run_${key.replace(/\W/g, "_")}_${started}`,
    at: new Date(started).toISOString(),
    result,
    affected: outcome.affected,
    summary: outcome.summary,
    // Deterministic, and honest: this is prototype work, not a network round-trip.
    durationMs: Math.max(1, outcome.affected * 3 + 8),
  };

  mutate((draft) => {
    draft.scheduledJobs ??= [];
    const state = draft.scheduledJobs.find((s) => s.key === key);
    if (!state) return;
    state.lastRunAt = run.at;
    state.lastResult = result;
    state.nextRunAt = new Date(started + job.everyMinutes * 60_000).toISOString();
    state.runs = [run, ...state.runs].slice(0, MAX_RUNS);
  });

  if (manual) {
    recordAudit({
      actor,
      action: "update",
      entity: "scheduled_job",
      entityId: job.key,
      entityLabel: job.name,
      summary: `Ran "${job.name}" manually — ${run.summary}`,
    });
  }

  return run;
}

/** Pause or resume a job's schedule. */
export function setJobStatus(
  key: string,
  status: JobStatus,
  actor: DomainActor = SYSTEM_ACTOR,
): JobState {
  jobState(key);
  const next = mutate((draft) => {
    const state = draft.scheduledJobs?.find((s) => s.key === key);
    if (state) state.status = status;
    return state ? structuredClone(state) : undefined;
  });
  const job = findJob(key);
  recordAudit({
    actor,
    action: status === "paused" ? "suspend" : "activate",
    entity: "scheduled_job",
    entityId: key,
    entityLabel: job?.name ?? key,
    summary: `Scheduled job "${job?.name ?? key}" ${status === "paused" ? "paused" : "resumed"}`,
  });
  return next ?? jobState(key);
}

/**
 * Run every job that is due. The dashboard calls this on a timer while it is
 * open, which is what makes the platform feel alive: queued messages progress,
 * expired holds come back, recovery nudges go out.
 */
export function tickScheduler(nowMs = Date.now()): JobRun[] {
  const runs: JobRun[] = [];
  for (const job of listJobs(nowMs)) {
    if (!job.due) continue;
    runs.push(runJob(job.key, { nowMs }));
  }
  return runs;
}

/** Aggregate KPIs for the Cron screen header. */
export function schedulerSummary(nowMs = Date.now()) {
  const jobs = listJobs(nowMs);
  return {
    total: jobs.length,
    active: jobs.filter((j) => j.status === "active").length,
    paused: jobs.filter((j) => j.status === "paused").length,
    failed: jobs.filter((j) => j.lastResult === "failed").length,
    due: jobs.filter((j) => j.due).length,
  };
}

export const schedulerService = {
  async list(): Promise<JobView[]> {
    return delay(listJobs());
  },
  async summary() {
    return delay(schedulerSummary());
  },
  async run(key: string, actor?: DomainActor): Promise<JobRun> {
    return delay(runJob(key, { actor, manual: true }));
  },
  async setStatus(key: string, status: JobStatus, actor?: DomainActor): Promise<JobState> {
    return delay(setJobStatus(key, status, actor));
  },
  tick: tickScheduler,
};
