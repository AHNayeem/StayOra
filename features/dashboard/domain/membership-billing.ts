/**
 * Recurring membership billing, and what happens when it fails.
 *
 * `membership.ts` could always renew a subscription — but only when a human
 * pressed the button, so a membership left alone simply lapsed on its renewal
 * date and the recurring revenue the plans promise never arrived. This module is
 * the missing half: the cycle runs itself, and a failed charge enters dunning
 * rather than silently ending the membership.
 *
 *   due → charge → renewed                       (the happy path)
 *   due → charge fails → dunning (retry ×3) → lapsed
 *
 * The charge outcome is **deterministic**, seeded on the subscriber and the
 * period being billed: the same demo always sees the same subscription go into
 * dunning, which is what makes the state demonstrable rather than a coin toss.
 * A real integration replaces {@link chargeRenewal} with the gateway call and
 * keeps every state below.
 */

import { hashString } from "@/lib/random";
import { membershipService, statusAt, type MembershipSubscription } from "./membership";
import { send } from "./messaging";
import { money } from "./money";
import { recordRevenue } from "./revenue";
import { SYSTEM_ACTOR, notify, recordAudit } from "./service-kit";
import { getState, mutate } from "./store";
import type { DomainActor } from "./types";
import type { JobOutcome } from "./scheduler";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Attempts before a membership is given up on. */
export const MAX_DUNNING_ATTEMPTS = 3;

/** Days between retries. */
export const DUNNING_RETRY_DAYS = 3;

/** Share of renewal charges that fail, percent — deterministic, not random. */
const FAILURE_RATE_PERCENT = 18;

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Dunning state
// ---------------------------------------------------------------------------

export interface MembershipDunning {
  attempts: number;
  lastAttemptAt: string;
  /** When the next retry is due. Absent once the membership has lapsed. */
  nextRetryAt?: string;
  /** Decline reason, in the words the member is shown. */
  reason: string;
}

/** Why a simulated charge was declined — realistic, and stable per subscriber. */
const DECLINE_REASONS = [
  "Your card was declined by the issuing bank.",
  "The card on file has expired.",
  "There weren't enough funds available.",
  "The bank asked for extra authentication we couldn't complete automatically.",
];

/**
 * Would this charge succeed? Seeded on the subscription and the period, so a
 * retry of the *same* period behaves consistently while the following period is
 * an independent draw — which is how a real card behaves after it is updated.
 */
function chargeRenewal(
  sub: MembershipSubscription,
  attempt: number,
): { ok: true } | { ok: false; reason: string } {
  const seed = hashString(`${sub.id}:${sub.periodsBilled}:${attempt}`);
  if (seed % 100 >= FAILURE_RATE_PERCENT) return { ok: true };
  return { ok: false, reason: DECLINE_REASONS[(seed >>> 7) % DECLINE_REASONS.length] };
}

function rows(): MembershipSubscription[] {
  return getState().memberships ?? [];
}

/** Subscriptions whose renewal (or retry) is due. */
export function dueForBilling(nowMs = Date.now()): MembershipSubscription[] {
  return rows().filter((sub) => {
    if (!sub.autoRenew || sub.status === "cancelled") return false;
    if (sub.price <= 0) return false;
    const dunning = sub.dunning;
    if (dunning) {
      // In dunning: wait for the retry window, and stop once we've given up.
      if (dunning.attempts >= MAX_DUNNING_ATTEMPTS) return false;
      return dunning.nextRetryAt
        ? new Date(dunning.nextRetryAt).getTime() <= nowMs
        : true;
    }
    return new Date(sub.renewsAt).getTime() <= nowMs;
  });
}

/** Memberships currently failing to bill — the admin's recovery worklist. */
export function inDunning(): MembershipSubscription[] {
  return rows().filter(
    (sub) => sub.dunning && sub.dunning.attempts < MAX_DUNNING_ATTEMPTS && sub.status !== "cancelled",
  );
}

// ---------------------------------------------------------------------------
// One cycle
// ---------------------------------------------------------------------------

export interface BillingOutcome {
  subscriptionId: string;
  reference: string;
  result: "renewed" | "dunning" | "lapsed";
  attempts: number;
  message: string;
}

/**
 * Bill one subscription's next period.
 *
 * On success this goes through `membershipService.renew` — the same path the
 * manual button uses — so the period, the counters and the revenue entry are all
 * written exactly once and in one place.
 */
export function billRenewal(
  subscriptionId: string,
  nowMs = Date.now(),
  actor: DomainActor = SYSTEM_ACTOR,
): BillingOutcome | undefined {
  const sub = rows().find((row) => row.id === subscriptionId);
  if (!sub) return undefined;

  const at = new Date(nowMs).toISOString();
  const attempt = (sub.dunning?.attempts ?? 0) + 1;
  const charge = chargeRenewal(sub, attempt);

  if (charge.ok) {
    const renewed = membershipService.renew(subscriptionId, at);
    if (!renewed) return undefined;
    mutate((draft) => {
      const row = draft.memberships.find((r) => r.id === subscriptionId);
      if (row) delete row.dunning;
    });
    recordRevenue({
      at,
      source: "membership",
      status: "finalized",
      currency: renewed.currency,
      label: `${renewed.planName} — period ${renewed.periodsBilled}`,
      grossValue: renewed.price,
      partnerShare: 0,
      amount: renewed.price,
      customerEmail: renewed.customerEmail,
      customerName: renewed.customerName,
      planId: renewed.planId,
      note: "Recurring renewal — simulated charge.",
    });
    send({
      templateKey: "membership_renewed",
      to: { email: renewed.customerEmail },
      customerEmail: renewed.customerEmail,
      href: "/account/membership",
      nowMs,
      context: {
        name: renewed.customerName.split(" ")[0],
        plan: renewed.planName,
        amount: `${renewed.currency} ${renewed.price.toFixed(2)}`,
        until: renewed.renewsAt.slice(0, 10),
      },
    });
    recordAudit({
      actor,
      action: "update",
      entity: "membership",
      entityId: renewed.id,
      entityLabel: renewed.reference,
      summary: `${renewed.planName} renewed for ${renewed.customerName} — ${renewed.currency} ${renewed.price.toFixed(2)}`,
      to: "active",
    });
    return {
      subscriptionId,
      reference: renewed.reference,
      result: "renewed",
      attempts: 0,
      message: `Renewed to ${renewed.renewsAt.slice(0, 10)}`,
    };
  }

  // Declined. Either schedule another attempt, or give up.
  const exhausted = attempt >= MAX_DUNNING_ATTEMPTS;
  mutate((draft) => {
    const row = draft.memberships.find((r) => r.id === subscriptionId);
    if (!row) return;
    row.dunning = {
      attempts: attempt,
      lastAttemptAt: at,
      nextRetryAt: exhausted
        ? undefined
        : new Date(nowMs + DUNNING_RETRY_DAYS * DAY_MS).toISOString(),
      reason: charge.reason,
    };
    if (exhausted) {
      // Benefits stop: the period was never paid for.
      row.autoRenew = false;
      row.status = "expired";
      row.cancelledAt = at;
    }
  });

  send({
    templateKey: exhausted ? "membership_lapsed" : "membership_payment_failed",
    to: { email: sub.customerEmail },
    customerEmail: sub.customerEmail,
    href: "/account/membership",
    nowMs,
    context: {
      name: sub.customerName.split(" ")[0],
      plan: sub.planName,
      amount: `${sub.currency} ${sub.price.toFixed(2)}`,
      reason: charge.reason,
      attempt: String(attempt),
      of: String(MAX_DUNNING_ATTEMPTS),
      retry: exhausted ? "" : `${DUNNING_RETRY_DAYS} days`,
    },
  });

  recordAudit({
    actor,
    action: "update",
    entity: "membership",
    entityId: sub.id,
    entityLabel: sub.reference,
    summary: exhausted
      ? `${sub.planName} lapsed for ${sub.customerName} after ${attempt} failed charges — ${charge.reason}`
      : `Renewal charge ${attempt} of ${MAX_DUNNING_ATTEMPTS} declined for ${sub.customerName} — ${charge.reason}`,
    to: exhausted ? "expired" : "dunning",
  });

  if (exhausted) {
    notify({
      category: "membership",
      audience: ["admin"],
      title: "Membership lapsed",
      body: `${sub.customerName} · ${sub.planName} · ${money(sub.price)} — ${MAX_DUNNING_ATTEMPTS} charges declined.`,
      href: "/dashboard/membership",
      tone: "warning",
    });
  }

  return {
    subscriptionId,
    reference: sub.reference,
    result: exhausted ? "lapsed" : "dunning",
    attempts: attempt,
    message: charge.reason,
  };
}

/**
 * Recover a membership by hand: the member updated their card, so retry now.
 * Resets the attempt counter, because the reason for the previous failures is
 * gone.
 */
export function retryBilling(
  subscriptionId: string,
  nowMs = Date.now(),
  actor: DomainActor = SYSTEM_ACTOR,
): BillingOutcome | undefined {
  mutate((draft) => {
    const row = draft.memberships.find((r) => r.id === subscriptionId);
    if (!row?.dunning) return;
    row.dunning.attempts = 0;
    row.dunning.nextRetryAt = new Date(nowMs).toISOString();
    if (row.status === "expired") {
      row.status = "active";
      row.autoRenew = true;
      row.cancelledAt = undefined;
    }
  });
  return billRenewal(subscriptionId, nowMs, actor);
}

/** Bill everything due. Driven by the `membership:renew` job. */
export function sweepMembershipRenewals(nowMs = Date.now()): JobOutcome {
  let renewed = 0;
  let dunning = 0;
  let lapsed = 0;

  for (const sub of dueForBilling(nowMs)) {
    const outcome = billRenewal(sub.id, nowMs);
    if (!outcome) continue;
    if (outcome.result === "renewed") renewed += 1;
    else if (outcome.result === "lapsed") lapsed += 1;
    else dunning += 1;
  }

  const affected = renewed + dunning + lapsed;
  return {
    affected,
    summary: affected
      ? `${renewed} renewed, ${dunning} in dunning, ${lapsed} lapsed`
      : "Nothing due to bill",
  };
}

export const membershipBillingService = {
  due: dueForBilling,
  inDunning,
  bill: billRenewal,
  retry: retryBilling,
  sweep: sweepMembershipRenewals,
  stats(nowMs = Date.now()) {
    const all = rows();
    const failing = inDunning();
    return {
      autoRenewing: all.filter((s) => s.autoRenew && statusAt(s, nowMs) === "active").length,
      due: dueForBilling(nowMs).length,
      inDunning: failing.length,
      atRisk: money(failing.reduce((sum, s) => sum + s.price, 0)),
      lapsed: all.filter((s) => s.dunning && s.dunning.attempts >= MAX_DUNNING_ATTEMPTS).length,
    };
  },
};
