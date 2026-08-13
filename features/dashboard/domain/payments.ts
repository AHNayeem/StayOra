/**
 * Mock payment engine.
 *
 * Simulates the parts of a gateway the product actually depends on —
 * authorization, decline, 3-D Secure step-up, capture, retry, deposit/balance
 * and refund — without any gateway being involved. It is deliberately obvious
 * that this is a simulation: every instrument carries `provider: "mock"`, and
 * **no card number is ever stored**. Only a brand, a last-4 and an expiry label
 * are kept, exactly as a real integration would keep a tokenised instrument.
 *
 * Demo behaviour is chosen by the *test card* the demo user picks, so a client
 * demo can show success, decline and 3DS without editing code.
 *
 * A real integration replaces `authorize`/`complete3DS`/`capture`/`refund` with
 * SDK calls and keeps the same shapes.
 */

import { money } from "./money";
import { getState, mutate, nextId, nextReference } from "./store";

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

export type MockCardBrand = "visa" | "mastercard" | "amex";

/** Safe, storable metadata about how someone paid. Never a PAN. */
export interface MockInstrument {
  provider: "mock";
  kind: "card" | "wallet" | "bank" | "cod" | "credit";
  brand: MockCardBrand | "bkash" | "nagad" | "paypal" | "bank" | "credit";
  /** Last four digits, or a wallet handle suffix. Display only. */
  last4: string;
  /** e.g. "09/29". Display only — never used to authorize anything. */
  expiryLabel?: string;
  label: string;
}

/**
 * Demo cards. Picking one *is* how a demo chooses the outcome — the same
 * technique every real gateway sandbox uses.
 */
export interface DemoCard {
  id: string;
  /** Shown in the UI, spaced. This is not a real card number. */
  display: string;
  brand: MockCardBrand;
  last4: string;
  expiryLabel: string;
  outcome: PaymentOutcome;
  label: string;
  description: string;
}

export type PaymentOutcome =
  | "success"
  | "declined"
  | "insufficient_funds"
  | "requires_3ds"
  | "requires_3ds_fail"
  | "gateway_error";

export const DEMO_CARDS: DemoCard[] = [
  {
    id: "card_success",
    display: "4242 4242 4242 4242",
    brand: "visa",
    last4: "4242",
    expiryLabel: "09/29",
    outcome: "success",
    label: "Approves immediately",
    description: "Payment authorized and captured straight away.",
  },
  {
    id: "card_3ds",
    display: "4000 0000 0000 3220",
    brand: "visa",
    last4: "3220",
    expiryLabel: "04/30",
    outcome: "requires_3ds",
    label: "3-D Secure challenge",
    description: "Steps up to an authentication code before it approves.",
  },
  {
    id: "card_declined",
    display: "4000 0000 0000 0002",
    brand: "visa",
    last4: "0002",
    expiryLabel: "11/28",
    outcome: "declined",
    label: "Declined by issuer",
    description: "Fails so you can demo the retry path.",
  },
  {
    id: "card_funds",
    display: "5555 5555 5555 4444",
    brand: "mastercard",
    last4: "4444",
    expiryLabel: "02/29",
    outcome: "insufficient_funds",
    label: "Insufficient funds",
    description: "Soft decline — retrying with another card succeeds.",
  },
];

export function findDemoCard(id: string): DemoCard | undefined {
  return DEMO_CARDS.find((c) => c.id === id);
}

/** The correct 3-D Secure code in the simulation. Anything else fails. */
export const DEMO_3DS_CODE = "1234";

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export type PaymentAttemptStatus =
  | "processing"
  | "requires_action"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refunded";

export interface PaymentAttemptEvent {
  at: string;
  label: string;
  detail?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

/** One attempt to take money. A retry creates a new attempt, never mutates one. */
export interface PaymentAttempt {
  id: string;
  reference: string;
  /** Set once the attempt is tied to a booking (may start life on a hold). */
  bookingId?: string;
  holdId?: string;
  /** Groups the retries of one checkout together. */
  intentId: string;
  amount: number;
  currency: string;
  /** For deposit flows: what is still owed after this attempt. */
  balanceDue: number;
  balanceDueAt?: string;
  instrument: MockInstrument;
  status: PaymentAttemptStatus;
  outcome: PaymentOutcome;
  failureCode?: string;
  failureMessage?: string;
  gatewayRef?: string;
  createdAt: string;
  authorizedAt?: string;
  capturedAt?: string;
  refunded: number;
  attemptNumber: number;
  timeline: PaymentAttemptEvent[];
}

const FAILURE_COPY: Record<string, { code: string; message: string }> = {
  declined: {
    code: "card_declined",
    message: "Your bank declined the payment. Try another card or contact your bank.",
  },
  insufficient_funds: {
    code: "insufficient_funds",
    message: "There aren't enough funds on this card. Try a different payment method.",
  },
  gateway_error: {
    code: "gateway_error",
    message: "We couldn't reach the payment provider. Nothing was charged — please retry.",
  },
  three_ds_failed: {
    code: "authentication_failed",
    message: "Authentication failed. The payment was not completed.",
  },
  expired: {
    code: "authentication_expired",
    message: "The authentication window expired. Please start the payment again.",
  },
};

function event(
  label: string,
  tone: PaymentAttemptEvent["tone"],
  at: string,
  detail?: string,
): PaymentAttemptEvent {
  return { at, label, tone, detail };
}

export interface AuthorizeInput {
  intentId: string;
  amount: number;
  currency?: string;
  instrument: MockInstrument;
  outcome: PaymentOutcome;
  bookingId?: string;
  holdId?: string;
  /** Deposit flows: what remains payable later. */
  balanceDue?: number;
  balanceDueAt?: string;
  nowMs?: number;
}

/** How long an attempt may sit in `requires_action` before it lapses. */
export const THREE_DS_WINDOW_MS = 5 * 60_000;

function push(attempt: PaymentAttempt): PaymentAttempt {
  mutate((draft) => draft.paymentAttempts.unshift(attempt));
  return structuredClone(attempt);
}

function update(id: string, patch: (a: PaymentAttempt) => void): PaymentAttempt {
  let result: PaymentAttempt | undefined;
  mutate((draft) => {
    const target = draft.paymentAttempts.find((a) => a.id === id);
    if (target) {
      patch(target);
      result = structuredClone(target);
    }
  });
  if (!result) throw new Error(`Unknown payment attempt ${id}`);
  return result;
}

/**
 * Attempt a payment. Resolves to an attempt in a terminal state (`captured` /
 * `failed`) or in `requires_action` when the demo card asks for 3-D Secure.
 */
export function authorize(input: AuthorizeInput): PaymentAttempt {
  const nowMs = input.nowMs ?? Date.now();
  const at = new Date(nowMs).toISOString();
  const prior = getState().paymentAttempts.filter((a) => a.intentId === input.intentId);

  const base: PaymentAttempt = {
    id: nextId("pat"),
    reference: nextReference("TXN", 60_000),
    bookingId: input.bookingId,
    holdId: input.holdId,
    intentId: input.intentId,
    amount: money(input.amount),
    currency: input.currency ?? "USD",
    balanceDue: money(input.balanceDue ?? 0),
    balanceDueAt: input.balanceDueAt,
    instrument: input.instrument,
    status: "processing",
    outcome: input.outcome,
    refunded: 0,
    attemptNumber: prior.length + 1,
    createdAt: at,
    timeline: [
      event(
        `Payment of ${input.currency ?? "USD"} ${money(input.amount).toFixed(2)} started`,
        "neutral",
        at,
        `${input.instrument.label} · attempt ${prior.length + 1}`,
      ),
    ],
  };

  switch (input.outcome) {
    case "success":
      base.status = "captured";
      base.authorizedAt = at;
      base.capturedAt = at;
      base.gatewayRef = `mock_${base.reference.toLowerCase()}`;
      base.timeline.push(
        event("Authorized by issuer", "success", at),
        event("Captured", "success", at, `Gateway ref ${base.gatewayRef}`),
      );
      break;

    case "requires_3ds":
    case "requires_3ds_fail":
      base.status = "requires_action";
      base.timeline.push(
        event("3-D Secure required", "warning", at, "Issuer asked for authentication."),
      );
      break;

    default: {
      const copy = FAILURE_COPY[input.outcome] ?? FAILURE_COPY.gateway_error;
      base.status = "failed";
      base.failureCode = copy.code;
      base.failureMessage = copy.message;
      base.timeline.push(event("Payment failed", "danger", at, copy.message));
    }
  }

  return push(base);
}

export type ThreeDsResult =
  | { ok: true; attempt: PaymentAttempt }
  | { ok: false; attempt: PaymentAttempt; message: string };

/**
 * Complete a 3-D Secure challenge. `DEMO_3DS_CODE` approves; anything else is
 * a failed authentication, and an expired window is its own failure.
 */
export function complete3DS(id: string, code: string, nowMs = Date.now()): ThreeDsResult {
  const current = getState().paymentAttempts.find((a) => a.id === id);
  if (!current) throw new Error(`Unknown payment attempt ${id}`);
  const at = new Date(nowMs).toISOString();

  if (current.status !== "requires_action") {
    return {
      ok: current.status === "captured",
      attempt: structuredClone(current),
      message: "This payment is no longer awaiting authentication.",
    };
  }

  const expired = nowMs - new Date(current.createdAt).getTime() > THREE_DS_WINDOW_MS;
  const passed = !expired && code.trim() === DEMO_3DS_CODE && current.outcome === "requires_3ds";

  if (passed) {
    const attempt = update(id, (a) => {
      a.status = "captured";
      a.authorizedAt = at;
      a.capturedAt = at;
      a.gatewayRef = `mock_${a.reference.toLowerCase()}`;
      a.timeline.push(
        event("Authentication successful", "success", at),
        event("Captured", "success", at, `Gateway ref mock_${a.reference.toLowerCase()}`),
      );
    });
    return { ok: true, attempt };
  }

  const copy = expired ? FAILURE_COPY.expired : FAILURE_COPY.three_ds_failed;
  const attempt = update(id, (a) => {
    a.status = "failed";
    a.failureCode = copy.code;
    a.failureMessage = copy.message;
    a.timeline.push(event("Authentication failed", "danger", at, copy.message));
  });
  return { ok: false, attempt, message: copy.message };
}

/** Attach a successful attempt to the booking it paid for. */
export function linkAttemptToBooking(id: string, bookingId: string): void {
  mutate((draft) => {
    const target = draft.paymentAttempts.find((a) => a.id === id);
    if (target) target.bookingId = bookingId;
  });
}

/** Record a refund against an attempt (the domain refund flow drives this). */
export function recordRefund(bookingId: string, amount: number, at: string): void {
  mutate((draft) => {
    const attempt = draft.paymentAttempts.find(
      (a) => a.bookingId === bookingId && a.status === "captured",
    );
    if (!attempt) return;
    attempt.refunded = money(attempt.refunded + amount);
    attempt.timeline.push(
      event(
        `Refunded ${attempt.currency} ${money(amount).toFixed(2)}`,
        "warning",
        at,
        attempt.refunded >= attempt.amount ? "Full refund" : "Partial refund",
      ),
    );
    if (attempt.refunded >= attempt.amount) attempt.status = "refunded";
  });
}

/** Take the outstanding balance on a deposit booking. */
export function payBalance(
  bookingId: string,
  amount: number,
  instrument: MockInstrument,
  outcome: PaymentOutcome,
  nowMs = Date.now(),
): PaymentAttempt {
  return authorize({
    intentId: `balance_${bookingId}`,
    amount,
    instrument,
    outcome,
    bookingId,
    nowMs,
  });
}

export function attemptsForBooking(bookingId: string): PaymentAttempt[] {
  return getState()
    .paymentAttempts.filter((a) => a.bookingId === bookingId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function attemptsForIntent(intentId: string): PaymentAttempt[] {
  return getState()
    .paymentAttempts.filter((a) => a.intentId === intentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Rolled-up money position for a booking. */
export interface PaymentPosition {
  paid: number;
  refunded: number;
  due: number;
  currency: string;
  attempts: PaymentAttempt[];
  lastFailure?: PaymentAttempt;
}

export function paymentPosition(bookingId: string, total: number): PaymentPosition {
  const attempts = attemptsForBooking(bookingId);
  const paid = attempts
    .filter((a) => a.status === "captured" || a.status === "refunded")
    .reduce((sum, a) => sum + a.amount, 0);
  const refunded = attempts.reduce((sum, a) => sum + a.refunded, 0);
  return {
    paid: money(paid),
    refunded: money(refunded),
    due: money(Math.max(0, total - paid)),
    currency: attempts[0]?.currency ?? "USD",
    attempts,
    lastFailure: [...attempts].reverse().find((a) => a.status === "failed"),
  };
}
