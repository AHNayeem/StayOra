/**
 * Split payment — a group booking paid by more than one person.
 *
 * The prototype could already take one card, or a deposit and a balance from the
 * same card (`PaymentPlan`). What it could not do is the thing groups actually
 * do: one person books, everyone pays their share. This module adds that as a
 * third payment plan, alongside `full` and `deposit`.
 *
 *   organiser books → shares invited → each pays → all paid → booking confirmed
 *
 * Two decisions worth stating:
 *
 * - **The organiser is committed from the start.** They pay their own share at
 *   checkout, and the booking is created and holds inventory immediately. A
 *   group that can't get everyone to pay would otherwise lose the room while
 *   waiting, which is the opposite of what a split is for.
 * - **The organiser can always cover the rest.** A split that stalls has to have
 *   an exit that doesn't lose the booking, so `coverRemaining` settles every
 *   outstanding share to the organiser's card in one step.
 *
 * A share link is a token, not a session: anyone holding it can pay that share,
 * which is exactly how these links work in practice. Nothing leaves the browser
 * — {@link payShare} runs the same deterministic simulation the rest of the
 * payment layer uses.
 */

import { hashString } from "@/lib/random";
import { send } from "./messaging";
import { money } from "./money";
import { notify, recordAudit, SYSTEM_ACTOR } from "./service-kit";
import { getState, mutate, nextId, nextReference } from "./store";
import type { DomainActor } from "./types";
import type { JobOutcome } from "./scheduler";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SplitShareStatus = "pending" | "paid" | "declined" | "covered";

export interface SplitShare {
  id: string;
  name: string;
  email: string;
  amountUsd: number;
  status: SplitShareStatus;
  /** True for the person who created the split — they pay at checkout. */
  organiser: boolean;
  invitedAt: string;
  paidAt?: string;
  /** Mock transaction reference, so the group can reconcile who paid what. */
  paymentRef?: string;
  declineReason?: string;
  /** Token in the share link. Anyone holding it can settle this share. */
  token: string;
}

export type SplitStatus = "collecting" | "complete" | "expired" | "cancelled";

export interface SplitPayment {
  id: string;
  reference: string;
  bookingId: string;
  bookingRef: string;
  productTitle: string;
  organiserEmail: string;
  organiserName: string;
  currency: string;
  totalUsd: number;
  status: SplitStatus;
  shares: SplitShare[];
  createdAt: string;
  /** Shares not settled by this point are the organiser's to cover. */
  expiresAt: string;
  completedAt?: string;
}

/** How long a group has to settle before the organiser is asked to cover. */
export const SPLIT_WINDOW_HOURS = 72;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function rows(): SplitPayment[] {
  return getState().splitPayments ?? [];
}

export function splitForBooking(bookingId: string): SplitPayment | undefined {
  return rows().find((split) => split.bookingId === bookingId);
}

export function getSplit(id: string): SplitPayment | undefined {
  return rows().find((split) => split.id === id);
}

/** Look a share up by the token in its link. */
export function shareByToken(
  token: string,
): { split: SplitPayment; share: SplitShare } | undefined {
  for (const split of rows()) {
    const share = split.shares.find((s) => s.token === token);
    if (share) return { split, share };
  }
  return undefined;
}

/** Splits a traveller is involved in — as organiser or as a payer. */
export function splitsFor(email: string): SplitPayment[] {
  const key = email.toLowerCase();
  return rows()
    .filter(
      (split) =>
        split.organiserEmail.toLowerCase() === key ||
        split.shares.some((share) => share.email.toLowerCase() === key),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function outstandingUsd(split: SplitPayment): number {
  return money(
    split.shares
      .filter((share) => share.status === "pending" || share.status === "declined")
      .reduce((sum, share) => sum + share.amountUsd, 0),
  );
}

export function collectedUsd(split: SplitPayment): number {
  return money(
    split.shares
      .filter((share) => share.status === "paid" || share.status === "covered")
      .reduce((sum, share) => sum + share.amountUsd, 0),
  );
}

/** The traveller-facing link that settles one share. */
export function shareHref(share: SplitShare): string {
  return `/account/split/${share.token}`;
}

// ---------------------------------------------------------------------------
// Splitting the money
// ---------------------------------------------------------------------------

export interface SplitParticipantInput {
  name: string;
  email: string;
  /** Explicit amount. Omit to take an equal share of what's left. */
  amountUsd?: number;
}

/**
 * Divide a total between participants to the cent.
 *
 * Explicit amounts are honoured; the rest is split equally, and the organiser
 * absorbs the rounding remainder. Splitting $100 three ways has to produce
 * 33.34 / 33.33 / 33.33, not three amounts that miss the total by a cent —
 * someone always ends up with the odd penny, and it should be the person who
 * chose to organise.
 */
export function divideTotal(
  totalUsd: number,
  participants: SplitParticipantInput[],
): { participant: SplitParticipantInput; amountUsd: number }[] {
  const total = money(totalUsd);
  const fixed = participants.filter((p) => typeof p.amountUsd === "number");
  const fixedSum = money(fixed.reduce((sum, p) => sum + (p.amountUsd ?? 0), 0));
  const flexible = participants.filter((p) => typeof p.amountUsd !== "number");

  const remaining = money(Math.max(0, total - fixedSum));
  const even = flexible.length > 0 ? Math.floor((remaining / flexible.length) * 100) / 100 : 0;

  const allocated = participants.map((participant) => ({
    participant,
    amountUsd: typeof participant.amountUsd === "number" ? money(participant.amountUsd) : even,
  }));

  // Hand the remainder to the first participant (the organiser, by convention).
  const sum = money(allocated.reduce((n, a) => n + a.amountUsd, 0));
  const remainder = money(total - sum);
  if (remainder !== 0 && allocated.length > 0) {
    allocated[0].amountUsd = money(allocated[0].amountUsd + remainder);
  }
  return allocated;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface CreateSplitInput {
  bookingId: string;
  bookingRef: string;
  productTitle: string;
  organiserName: string;
  organiserEmail: string;
  totalUsd: number;
  currency?: string;
  /** Everyone paying, organiser included and first. */
  participants: SplitParticipantInput[];
}

function tokenFor(bookingId: string, email: string, index: number): string {
  return `shr${hashString(`${bookingId}:${email}:${index}`).toString(36).slice(0, 10)}`;
}

/**
 * Open a split on a booking. The organiser's share is marked paid immediately —
 * they settled it at checkout — and everyone else is invited.
 */
export function createSplit(input: CreateSplitInput, nowMs = Date.now()): SplitPayment {
  const at = new Date(nowMs).toISOString();
  const allocated = divideTotal(input.totalUsd, input.participants);

  const shares: SplitShare[] = allocated.map(({ participant, amountUsd }, index) => {
    const organiser =
      index === 0 ||
      participant.email.toLowerCase() === input.organiserEmail.toLowerCase();
    return {
      id: nextId("shr"),
      name: participant.name,
      email: participant.email,
      amountUsd,
      // The organiser paid at checkout; everyone else owes.
      status: organiser ? "paid" : "pending",
      organiser,
      invitedAt: at,
      paidAt: organiser ? at : undefined,
      paymentRef: organiser ? nextReference("TXN", 77_000) : undefined,
      token: tokenFor(input.bookingId, participant.email, index),
    };
  });

  const split: SplitPayment = {
    id: nextId("spl"),
    reference: nextReference("SPL", 52_000),
    bookingId: input.bookingId,
    bookingRef: input.bookingRef,
    productTitle: input.productTitle,
    organiserEmail: input.organiserEmail,
    organiserName: input.organiserName,
    currency: input.currency ?? "USD",
    totalUsd: money(input.totalUsd),
    status: shares.every((s) => s.status === "paid") ? "complete" : "collecting",
    shares,
    createdAt: at,
    expiresAt: new Date(nowMs + SPLIT_WINDOW_HOURS * 3_600_000).toISOString(),
    completedAt: shares.every((s) => s.status === "paid") ? at : undefined,
  };

  mutate((state) => {
    state.splitPayments ??= [];
    state.splitPayments.unshift(split);
  });

  for (const share of shares) {
    if (share.organiser) continue;
    inviteShare(split, share, nowMs);
  }

  return split;
}

/** Write to one participant with their link and what they owe. */
function inviteShare(split: SplitPayment, share: SplitShare, nowMs: number): void {
  send({
    templateKey: "split_invite",
    to: { email: share.email },
    customerEmail: share.email,
    bookingId: split.bookingId,
    bookingRef: split.bookingRef,
    href: shareHref(share),
    nowMs,
    context: {
      name: share.name.split(" ")[0],
      organiser: split.organiserName.split(" ")[0],
      product: split.productTitle,
      amount: `${split.currency} ${share.amountUsd.toFixed(2)}`,
      total: `${split.currency} ${split.totalUsd.toFixed(2)}`,
      reference: split.bookingRef,
      hours: String(SPLIT_WINDOW_HOURS),
    },
  });
}

/** Nudge the people who haven't paid yet. Returns how many were written to. */
export function remindOutstanding(splitId: string, nowMs = Date.now()): number {
  const split = getSplit(splitId);
  if (!split || split.status !== "collecting") return 0;
  let sent = 0;
  for (const share of split.shares) {
    if (share.status !== "pending" && share.status !== "declined") continue;
    inviteShare(split, share, nowMs);
    sent += 1;
  }
  return sent;
}

/** Recompute a split's status from its shares, and settle the booking if done. */
function settleIfComplete(splitId: string, nowMs: number, actor: DomainActor): boolean {
  const split = getSplit(splitId);
  if (!split || split.status !== "collecting") return false;
  const done = split.shares.every(
    (share) => share.status === "paid" || share.status === "covered",
  );
  if (!done) return false;

  mutate((state) => {
    const row = state.splitPayments?.find((s) => s.id === splitId);
    if (!row) return;
    row.status = "complete";
    row.completedAt = new Date(nowMs).toISOString();
  });

  send({
    templateKey: "split_complete",
    to: { email: split.organiserEmail },
    customerEmail: split.organiserEmail,
    bookingId: split.bookingId,
    bookingRef: split.bookingRef,
    href: `/account/bookings/${split.bookingId}`,
    nowMs,
    context: {
      name: split.organiserName.split(" ")[0],
      product: split.productTitle,
      total: `${split.currency} ${split.totalUsd.toFixed(2)}`,
      reference: split.bookingRef,
      people: String(split.shares.length),
    },
  });
  recordAudit({
    actor,
    action: "update",
    entity: "split_payment",
    entityId: split.id,
    entityLabel: split.reference,
    summary: `Split settled in full — ${split.shares.length} payers, ${split.currency} ${split.totalUsd.toFixed(2)}`,
    to: "complete",
  });
  return true;
}

export interface PayShareResult {
  ok: boolean;
  share?: SplitShare;
  split?: SplitPayment;
  /** True when this payment was the one that finished the split. */
  completed: boolean;
  message: string;
}

/**
 * Settle one share.
 *
 * The charge outcome is deterministic on the share and the attempt, so a demo
 * reliably shows one participant's card being declined — and the retry that
 * follows succeeding, because the attempt number is part of the seed.
 */
export function payShare(
  token: string,
  nowMs = Date.now(),
  actor: DomainActor = SYSTEM_ACTOR,
): PayShareResult {
  const found = shareByToken(token);
  if (!found) {
    return { ok: false, completed: false, message: "That payment link is no longer valid." };
  }
  const { split, share } = found;

  if (split.status === "cancelled") {
    return { ok: false, completed: false, message: "This booking was cancelled." };
  }
  if (share.status === "paid" || share.status === "covered") {
    return {
      ok: true,
      share,
      split,
      completed: split.status === "complete",
      message: "This share is already settled.",
    };
  }

  // Second attempt on a previously-declined share always clears: the point is
  // to exercise the retry, not to trap the participant.
  const attempt = share.status === "declined" ? 2 : 1;
  const declined = attempt === 1 && hashString(`${share.id}:pay`) % 100 < 15;

  if (declined) {
    mutate((state) => {
      const row = state.splitPayments
        ?.find((s) => s.id === split.id)
        ?.shares.find((s) => s.id === share.id);
      if (row) {
        row.status = "declined";
        row.declineReason = "Your card was declined by the issuing bank.";
      }
    });
    return {
      ok: false,
      share,
      split,
      completed: false,
      message: "Your card was declined by the issuing bank. Try again or use another card.",
    };
  }

  const ref = nextReference("TXN", 77_000);
  mutate((state) => {
    const row = state.splitPayments
      ?.find((s) => s.id === split.id)
      ?.shares.find((s) => s.id === share.id);
    if (row) {
      row.status = "paid";
      row.paidAt = new Date(nowMs).toISOString();
      row.paymentRef = ref;
      row.declineReason = undefined;
    }
  });

  const completed = settleIfComplete(split.id, nowMs, actor);
  const updated = getSplit(split.id);
  return {
    ok: true,
    share: updated?.shares.find((s) => s.id === share.id),
    split: updated,
    completed,
    message: completed
      ? "Paid — that was the last share, so the booking is settled in full."
      : `Paid. ${updated ? outstandingUsd(updated).toFixed(2) : "0.00"} still outstanding.`,
  };
}

/**
 * The organiser pays everything still outstanding. The exit a stalled split
 * needs so the booking is never lost to someone else's inaction.
 */
export function coverRemaining(
  splitId: string,
  nowMs = Date.now(),
  actor: DomainActor = SYSTEM_ACTOR,
): { covered: number; amountUsd: number } {
  const split = getSplit(splitId);
  if (!split) return { covered: 0, amountUsd: 0 };

  const outstanding = split.shares.filter(
    (share) => share.status === "pending" || share.status === "declined",
  );
  if (outstanding.length === 0) return { covered: 0, amountUsd: 0 };

  const amountUsd = money(outstanding.reduce((sum, share) => sum + share.amountUsd, 0));
  const ref = nextReference("TXN", 77_000);
  mutate((state) => {
    const row = state.splitPayments?.find((s) => s.id === splitId);
    if (!row) return;
    for (const share of row.shares) {
      if (share.status === "pending" || share.status === "declined") {
        share.status = "covered";
        share.paidAt = new Date(nowMs).toISOString();
        share.paymentRef = ref;
      }
    }
  });

  settleIfComplete(splitId, nowMs, actor);
  notify({
    category: "booking",
    audience: ["customer"],
    title: "You covered the rest of the split",
    body: `${split.currency} ${amountUsd.toFixed(2)} across ${outstanding.length} unpaid share${outstanding.length === 1 ? "" : "s"} for ${split.productTitle}.`,
    href: `/account/bookings/${split.bookingId}`,
  });
  return { covered: outstanding.length, amountUsd };
}

/** Close a split because its booking was cancelled. */
export function cancelSplit(bookingId: string): void {
  mutate((state) => {
    const row = state.splitPayments?.find((s) => s.bookingId === bookingId);
    if (row && row.status !== "complete") row.status = "cancelled";
  });
}

/**
 * Chase or close down splits whose window has passed.
 *
 * An expired split isn't a cancelled booking: the organiser is asked to cover
 * the balance, because the room is already theirs. Driven by `split:chase`.
 */
export function sweepSplitPayments(nowMs = Date.now()): JobOutcome {
  let reminded = 0;
  let expired = 0;

  for (const split of rows()) {
    if (split.status !== "collecting") continue;
    const overdue = new Date(split.expiresAt).getTime() <= nowMs;

    if (!overdue) {
      reminded += remindOutstanding(split.id, nowMs) > 0 ? 1 : 0;
      continue;
    }

    mutate((state) => {
      const row = state.splitPayments?.find((s) => s.id === split.id);
      if (row) row.status = "expired";
    });
    send({
      templateKey: "split_expired",
      to: { email: split.organiserEmail },
      customerEmail: split.organiserEmail,
      bookingId: split.bookingId,
      bookingRef: split.bookingRef,
      href: `/account/bookings/${split.bookingId}`,
      nowMs,
      context: {
        name: split.organiserName.split(" ")[0],
        product: split.productTitle,
        amount: `${split.currency} ${outstandingUsd(split).toFixed(2)}`,
        reference: split.bookingRef,
      },
    });
    expired += 1;
  }

  const affected = reminded + expired;
  return {
    affected,
    summary: affected
      ? `${reminded} split${reminded === 1 ? "" : "s"} chased, ${expired} expired`
      : "No splits outstanding",
  };
}

export const splitPaymentService = {
  create: createSplit,
  forBooking: splitForBooking,
  forCustomer: splitsFor,
  get: getSplit,
  byToken: shareByToken,
  pay: payShare,
  remind: remindOutstanding,
  cover: coverRemaining,
  cancel: cancelSplit,
  sweep: sweepSplitPayments,
  outstanding: outstandingUsd,
  collected: collectedUsd,
  href: shareHref,
  divide: divideTotal,
  stats() {
    const all = rows();
    const collecting = all.filter((s) => s.status === "collecting");
    return {
      total: all.length,
      collecting: collecting.length,
      complete: all.filter((s) => s.status === "complete").length,
      outstanding: money(collecting.reduce((sum, s) => sum + outstandingUsd(s), 0)),
    };
  },
};
