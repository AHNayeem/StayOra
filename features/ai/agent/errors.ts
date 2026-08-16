/**
 * Typed agent errors.
 *
 * Every failure the agent can hit is one of these, carrying the code the UI
 * maps to a block and a sentence written for a traveller. Internal detail —
 * module names, stack traces, engine internals — is kept on `cause` and never
 * reaches an answer, which is both a privacy rule and a quality one: "the
 * checkout service threw" is not information a traveller can act on.
 */

import type { AIBookingFailure, AIErrorCode } from "@/types/ai-booking";

export class AgentError extends Error {
  readonly code: AIErrorCode;
  /** Traveller-safe sentence. */
  readonly userMessage: string;
  readonly details: string[];
  readonly recoverable: boolean;
  readonly retryLabel?: string;

  constructor(
    code: AIErrorCode,
    userMessage: string,
    options: {
      details?: string[];
      recoverable?: boolean;
      retryLabel?: string;
      cause?: unknown;
    } = {},
  ) {
    super(`${code}: ${userMessage}`);
    this.name = "AgentError";
    this.code = code;
    this.userMessage = userMessage;
    this.details = options.details ?? [];
    this.recoverable = options.recoverable ?? true;
    this.retryLabel = options.retryLabel;
    if (options.cause !== undefined) this.cause = options.cause;
  }

  /** The renderable failure this error becomes. */
  toFailure(title?: string): AIBookingFailure {
    return {
      code: this.code,
      title: title ?? DEFAULT_TITLES[this.code],
      message: this.userMessage,
      recoverable: this.recoverable,
      retryLabel: this.retryLabel,
      details: this.details.length ? this.details : undefined,
    };
  }
}

const DEFAULT_TITLES: Record<AIErrorCode, string> = {
  tool_error: "I couldn't complete that",
  validation_failed: "Something doesn't add up",
  availability_lost: "That's no longer available",
  price_changed: "The price changed",
  booking_failed: "The booking didn't go through",
  authentication_required: "Sign in to continue",
  payment_required: "A payment method is needed",
  payment_failed: "The payment was declined",
  unsupported_request: "I can't do that yet",
  missing_information: "I need a little more from you",
  limit_exceeded: "That's a bigger job than one turn",
};

/** Wrap anything thrown by a tool into an {@link AgentError}. */
export function toAgentError(error: unknown, tool?: string): AgentError {
  if (error instanceof AgentError) return error;
  return new AgentError(
    "tool_error",
    tool
      ? "I couldn't reach part of our booking system just then. Try again in a moment."
      : "Something went wrong on my side. Try again in a moment.",
    { cause: error },
  );
}
