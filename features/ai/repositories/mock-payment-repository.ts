/**
 * MockPaymentRepository — the payment abstraction the booking agent charges
 * against.
 *
 * It wraps the platform's own demo gateway (`domain/payments`), the same one
 * the checkout page uses, so a card that declines at checkout declines here too
 * and the agent has a real failure path to render. Nothing sensitive is ever
 * held: a method is an id, a brand and four digits, and the PAN never leaves the
 * demo card table.
 *
 * A real build replaces this class with an `ApiPaymentRepository` that creates a
 * PaymentIntent server-side. The interface already has the right shape for it.
 */

import type { AIPaymentMethod, AIPaymentResult } from "@/types/ai";
import {
  DEMO_CARDS,
  attemptsForIntent,
  authorize,
  complete3DS,
  findDemoCard,
  type MockInstrument,
  type PaymentAttempt,
} from "@/features/dashboard/domain";
import type { PaymentAuthorizeInput, PaymentRepository } from "./types";

/** Demo card → the payment method the assistant offers. */
function toMethod(card: (typeof DEMO_CARDS)[number]): AIPaymentMethod {
  return {
    id: card.id,
    label: `${card.brand.toUpperCase()} ···· ${card.last4}`,
    kind: "card",
    brand: card.brand,
    last4: card.last4,
    expiryLabel: card.expiryLabel,
    description: card.description,
    isDefault: card.outcome === "success",
  };
}

function toInstrument(card: (typeof DEMO_CARDS)[number]): MockInstrument {
  return {
    provider: "mock",
    kind: "card",
    brand: card.brand,
    last4: card.last4,
    expiryLabel: card.expiryLabel,
    label: `${card.brand.toUpperCase()} ···· ${card.last4}`,
  };
}

function toResult(attempt: PaymentAttempt): AIPaymentResult {
  if (attempt.status === "captured" || attempt.status === "authorized") {
    return {
      status: "captured",
      reference: attempt.reference,
      amountUsd: attempt.amount,
      attemptId: attempt.id,
    };
  }
  if (attempt.status === "requires_action") {
    return {
      status: "requires_authentication",
      amountUsd: attempt.amount,
      attemptId: attempt.id,
      message: "Your bank needs to confirm this payment.",
    };
  }
  return {
    status: "failed",
    amountUsd: attempt.amount,
    attemptId: attempt.id,
    message: attempt.failureMessage ?? "The payment was declined.",
  };
}

export class MockPaymentRepository implements PaymentRepository {
  readonly id = "mock-payments";

  async listMethods(): Promise<AIPaymentMethod[]> {
    return DEMO_CARDS.map(toMethod);
  }

  /**
   * Authorize a charge. The *card decides the outcome*, exactly as in a gateway
   * sandbox — which is what gives the prototype genuine decline and step-up
   * paths instead of a coin flip.
   */
  async authorize(input: PaymentAuthorizeInput): Promise<AIPaymentResult> {
    const card = findDemoCard(input.methodId) ?? DEMO_CARDS[0];
    const attempt = authorize({
      intentId: input.intentId,
      amount: input.amountUsd,
      instrument: toInstrument(card),
      outcome: card.outcome,
    });
    return toResult(attempt);
  }

  async authenticate(attemptId: string, code: string): Promise<AIPaymentResult> {
    const result = complete3DS(attemptId, code);
    return toResult(result.attempt);
  }

  /** Attempts already made against an intent — used to cap retries. */
  attemptCount(intentId: string): number {
    return attemptsForIntent(intentId).length;
  }
}
