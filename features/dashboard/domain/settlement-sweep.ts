/**
 * Settlement release — the scheduled half of the payout track.
 *
 * Settlements were only ever advanced by hand. In practice a payout run is a
 * nightly job: everything scheduled for today moves one step, and finance only
 * intervenes on exceptions. This sweep does exactly that, using the same
 * `settlementService.advance` transition the UI calls, so the audit trail and
 * the merchant notifications are identical either way.
 *
 * It deliberately stops at `processing`: releasing money to a merchant stays a
 * human decision, and the prototype should not pretend a payout rail exists.
 */

import { getState } from "./store";
import { SYSTEM_ACTOR } from "./service-kit";
import type { JobOutcome } from "./scheduler";
import type { Settlement, SettlementStatus } from "./types";

/** What the sweep is willing to do without a human. */
const AUTO_TRANSITIONS: Partial<Record<SettlementStatus, SettlementStatus>> = {
  pending: "processing",
};

function isDue(settlement: Settlement, nowMs: number): boolean {
  return new Date(settlement.scheduledFor).getTime() <= nowMs;
}

export function sweepDueSettlements(nowMs = Date.now()): JobOutcome {
  // Imported lazily: `services.ts` imports half the domain, and the scheduler is
  // reachable from it, so a static import here would close a cycle.
  const advanced: string[] = [];
  const due = getState().settlements.filter(
    (s) => isDue(s, nowMs) && AUTO_TRANSITIONS[s.status],
  );

  for (const settlement of due) {
    const to = AUTO_TRANSITIONS[settlement.status];
    if (!to) continue;
    // The store is the single writer; go through the service so the audit entry
    // and merchant notification happen exactly as they would from the UI.
    void import("./services").then(({ settlementService }) =>
      settlementService.advance(settlement.id, to, {
        actor: SYSTEM_ACTOR,
        note: "Released by the nightly settlement run.",
      }),
    );
    advanced.push(settlement.reference);
  }

  return {
    affected: advanced.length,
    summary: advanced.length
      ? `${advanced.length} settlement(s) moved to processing`
      : "No settlements due",
  };
}
