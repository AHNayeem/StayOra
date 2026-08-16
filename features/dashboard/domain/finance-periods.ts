/**
 * Financial period close — freezing history so it stops moving.
 *
 * Every figure in the Revenue Center is derived on read. That is the right
 * default (nothing can drift out of sync with the bookings) but it has one
 * uncomfortable consequence: a refund raised today silently changes what last
 * quarter earned. Finance cannot file numbers that keep moving.
 *
 * Closing a period takes a point-in-time snapshot of it and marks it closed.
 * Reads for a closed period return the snapshot; open periods stay live. That
 * is the whole idea — no second ledger, no duplicated data, just a frozen copy
 * of what the derived figures said at the moment of close.
 *
 * Reopening is deliberately possible, audited, and keeps the superseded
 * snapshot in `history`, because in practice periods do get reopened.
 */

import { platformFinancials } from "./money";
import { revenueLedger, summarizeRevenue } from "./revenue";
import { SYSTEM_ACTOR, delay, invalid, recordAudit } from "./service-kit";
import { getState, mutate } from "./store";
import type { DomainActor } from "./types";

export type PeriodStatus = "open" | "closed";

export interface PeriodSnapshot {
  takenAt: string;
  takenBy: string;
  gmv: number;
  netSales: number;
  commission: number;
  fees: number;
  taxes: number;
  refunds: number;
  merchantEarnings: number;
  platformRevenue: number;
  bookingCount: number;
  currency: string;
}

export interface FinancePeriod {
  /** `YYYY-MM` — periods are calendar months. */
  id: string;
  label: string;
  start: string;
  end: string;
  status: PeriodStatus;
  closedAt?: string;
  closedBy?: string;
  note?: string;
  snapshot?: PeriodSnapshot;
  /** Snapshots superseded by a reopen → re-close cycle. */
  history: PeriodSnapshot[];
}

function periodBounds(id: string): { start: string; end: string; label: string } {
  const [year, month] = id.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

/** `YYYY-MM` for an ISO timestamp. */
export function periodIdFor(iso: string): string {
  return iso.slice(0, 7);
}

function stored(): FinancePeriod[] {
  return getState().financePeriods ?? [];
}

/** Compute a period's figures from the live data. */
export function computePeriod(id: string): PeriodSnapshot {
  const { start, end } = periodBounds(id);
  const state = getState();
  const bookings = state.bookings.filter((b) => b.createdAt >= start && b.createdAt < end);
  const settlements = state.settlements.filter(
    (s) => s.periodStart >= start && s.periodStart < end,
  );
  const financials = platformFinancials(bookings, settlements);
  const summary = summarizeRevenue(revenueLedger({ from: start, to: end }));

  return {
    takenAt: new Date().toISOString(),
    takenBy: SYSTEM_ACTOR.name,
    gmv: financials.gmv,
    netSales: financials.netSales,
    commission: financials.commission,
    fees: financials.fees,
    taxes: financials.taxes,
    refunds: financials.refunds,
    merchantEarnings: financials.merchantEarnings,
    platformRevenue: summary.netPlatformRevenue,
    bookingCount: bookings.length,
    currency: financials.currency,
  };
}

/**
 * A period's figures: the frozen snapshot when closed, live numbers when open.
 * This is the function every report should call — it is what makes "closed"
 * mean something.
 */
export function periodFigures(id: string): PeriodSnapshot {
  const period = stored().find((p) => p.id === id);
  if (period?.status === "closed" && period.snapshot) return period.snapshot;
  return computePeriod(id);
}

/** The last `count` months, newest first, with their status. */
export function listPeriods(count = 12, nowMs = Date.now()): FinancePeriod[] {
  const now = new Date(nowMs);
  const rows: FinancePeriod[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const id = date.toISOString().slice(0, 7);
    const bounds = periodBounds(id);
    const existing = stored().find((p) => p.id === id);
    rows.push(
      existing ?? {
        id,
        label: bounds.label,
        start: bounds.start,
        end: bounds.end,
        status: "open",
        history: [],
      },
    );
  }
  return rows;
}

/** Is this period locked against new financial activity? */
export function isPeriodClosed(id: string): boolean {
  return stored().some((p) => p.id === id && p.status === "closed");
}

export const financePeriodService = {
  async list(count = 12): Promise<FinancePeriod[]> {
    return delay(listPeriods(count));
  },

  async get(id: string): Promise<FinancePeriod> {
    const bounds = periodBounds(id);
    return delay(
      stored().find((p) => p.id === id) ?? {
        id,
        label: bounds.label,
        start: bounds.start,
        end: bounds.end,
        status: "open" as const,
        history: [],
      },
    );
  },

  /** Figures for a period — frozen if closed, live if open. */
  async figures(id: string): Promise<PeriodSnapshot> {
    return delay(periodFigures(id));
  },

  /**
   * Close a period. The current month cannot be closed — it is still
   * accumulating, and a snapshot of a partial month is worse than no snapshot.
   */
  async close(
    id: string,
    options: { actor?: DomainActor; note?: string; nowMs?: number } = {},
  ): Promise<FinancePeriod> {
    const { actor = SYSTEM_ACTOR, note, nowMs = Date.now() } = options;
    const currentId = new Date(nowMs).toISOString().slice(0, 7);
    if (id >= currentId) invalid("A period can only be closed once the month has ended.");
    if (isPeriodClosed(id)) invalid("That period is already closed.");

    const snapshot: PeriodSnapshot = {
      ...computePeriod(id),
      takenAt: new Date(nowMs).toISOString(),
      takenBy: actor.name,
    };
    const bounds = periodBounds(id);

    const period = mutate((draft) => {
      draft.financePeriods ??= [];
      const existing = draft.financePeriods.find((p) => p.id === id);
      if (existing) {
        if (existing.snapshot) existing.history.unshift(existing.snapshot);
        existing.status = "closed";
        existing.closedAt = new Date(nowMs).toISOString();
        existing.closedBy = actor.name;
        existing.note = note;
        existing.snapshot = snapshot;
        return structuredClone(existing);
      }
      const created: FinancePeriod = {
        id,
        label: bounds.label,
        start: bounds.start,
        end: bounds.end,
        status: "closed",
        closedAt: new Date(nowMs).toISOString(),
        closedBy: actor.name,
        note,
        snapshot,
        history: [],
      };
      draft.financePeriods.unshift(created);
      return structuredClone(created);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "finance_period",
      entityId: id,
      entityLabel: period.label,
      summary: `Closed ${period.label} — revenue ${snapshot.currency} ${snapshot.platformRevenue.toFixed(2)} on ${snapshot.bookingCount} bookings. Figures are frozen.`,
      from: "open",
      to: "closed",
    });

    return delay(period);
  },

  /** Reopen a closed period, keeping the superseded snapshot for the trail. */
  async reopen(
    id: string,
    options: { actor?: DomainActor; reason?: string } = {},
  ): Promise<FinancePeriod> {
    const { actor = SYSTEM_ACTOR, reason } = options;
    if (!isPeriodClosed(id)) invalid("That period is not closed.");

    const period = mutate((draft) => {
      const row = draft.financePeriods?.find((p) => p.id === id);
      if (!row) return undefined;
      row.status = "open";
      row.note = reason;
      row.closedAt = undefined;
      row.closedBy = undefined;
      return structuredClone(row);
    });
    if (!period) invalid("That period is not closed.");

    recordAudit({
      actor,
      action: "update",
      entity: "finance_period",
      entityId: id,
      entityLabel: period.label,
      summary: `Reopened ${period.label}${reason ? ` — ${reason}` : ""}. Figures are live again.`,
      from: "closed",
      to: "open",
    });

    return delay(period);
  },
};
