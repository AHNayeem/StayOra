/**
 * ai.ts — service seam for the travel assistant.
 *
 * Sits alongside `catalog`, `search`, `flight.service` and `account` and follows
 * the same contract: an async call that the UI is already written against. Today
 * it delegates to the local provider; a hosted model becomes a `fetch` to
 * `POST /ai/messages` inside {@link askAssistant} and nothing above this file
 * changes.
 *
 * `today` and `countryCode` are passed *in* rather than read here, so the engine
 * stays pure and the answer respects the visitor's locale.
 */

import type {
  AIAuthContext,
  AIPageContext,
  AIRequest,
  AIRespondOptions,
  AIResponse,
  AITripContext,
  AIUserAction,
} from "@/types/ai";
import { getAIProvider } from "@/features/ai/provider";

/** Raised when a turn fails, so the chat can offer Retry rather than a dead end. */
export class AIError extends Error {
  constructor(message = "The assistant couldn't answer that. Try again.") {
    super(message);
    this.name = "AIError";
  }
}

export interface AskAssistantInput {
  message: string;
  /** The structured action behind the message, when a rich block raised one. */
  action?: AIUserAction;
  context: AITripContext;
  page?: AIPageContext;
  today: string;
  countryCode?: string;
  /** The signed-in traveller. Booking actions require one. */
  auth?: AIAuthContext;
  /** Wall clock at send time — read by the caller, never by the engine. */
  nowMs?: number;
}

/**
 * Ask the assistant one question.
 *
 * No artificial delay is added here — the tools call the real service layer,
 * which already simulates network latency (a flight search takes ~900 ms), so
 * loading states are exercised by genuine work rather than a `setTimeout`.
 */
export async function askAssistant(
  input: AskAssistantInput,
  options?: AIRespondOptions,
): Promise<AIResponse> {
  const request: AIRequest = {
    message: input.message.trim(),
    action: input.action,
    context: input.context,
    page: input.page,
    auth: input.auth,
    today: input.today,
    nowMs: input.nowMs,
    countryCode: input.countryCode,
  };

  // A structured action carries its own meaning, so it doesn't need words with
  // it — a tapped "Confirm booking" is a complete instruction.
  if (!request.message && !request.action) {
    throw new AIError("Ask me something about your trip.");
  }

  try {
    return await getAIProvider().respond(request, options);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[ai] respond failed", error);
    throw new AIError();
  }
}

/** Which engine is answering — surfaced in the assistant footer. */
export function getAssistantInfo(): { id: string; label: string } {
  const provider = getAIProvider();
  return { id: provider.id, label: provider.label };
}
