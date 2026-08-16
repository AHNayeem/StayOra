/**
 * The agent loop.
 *
 *   message → NLU → context → plan → tool execution → validation → response
 *
 * Each stage is a separate, replaceable function. The deterministic planner in
 * this build could be swapped for a model that emits the same
 * {@link AgentAction} union and *nothing else would change* — the tool runner
 * would still enforce permissions and budgets, the booking machine would still
 * reject illegal transitions, and the composer would still render the same
 * blocks.
 *
 * Events are emitted throughout. Today they arrive in one batch when the turn
 * finishes; the same emitter is what a streaming provider would call as it goes.
 */

import type {
  AIBlock,
  AIProgressStep,
  AIRequest,
  AIRespondOptions,
  AIResponse,
  AgentAction,
  AgentEvent,
} from "@/types/ai";
import { parseMessage } from "../nlu/parse";
import { AgentError, toAgentError } from "./errors";
import { createLogger } from "./logger";
import { planTurn } from "./planner";
import { DEFAULT_AGENT_POLICY, PolicyBudget, trimContext, type AgentPolicy } from "./policy";
import { resolveReference } from "./reference";
import { ToolRunner } from "./tool-runner";
import { mergeContext, type ActionContext, type ActionResult } from "./shared";
import * as conversation from "./actions/conversation";
import * as search from "./actions/search";
import * as planning from "./actions/plan";
import * as comparison from "./actions/compare";
import * as accountActions from "./actions/account";
import * as booking from "./actions/booking";

export interface RunAgentOptions extends AIRespondOptions {
  policy?: AgentPolicy;
  /** Elapsed-time source. Injected so tests are deterministic. */
  now?: () => number;
}

/** Run one turn. Never throws: every failure becomes a renderable answer. */
export async function runAgent(
  request: AIRequest,
  options: RunAgentOptions = {},
): Promise<AIResponse> {
  const policy = options.policy ?? DEFAULT_AGENT_POLICY;
  const now = options.now ?? (() => (typeof performance !== "undefined" ? performance.now() : 0));
  const startedAt = now();

  const events: AgentEvent[] = [];
  const emit = (event: AgentEvent) => {
    events.push(event);
    options.onEvent?.(event);
  };

  const parsed = parseMessage(request.message, {
    context: request.context,
    today: request.today,
  });
  const logger = createLogger(String(parsed.intent));
  const budget = new PolicyBudget(policy, startedAt, now);
  const tools = new ToolRunner({ budget, logger, emit, auth: request.auth, now });

  logger.event({ type: "start", message: `${request.message.length} chars` });
  emit({ type: "start", message: request.message });
  emit({ type: "intent", intent: parsed.intent });

  const context = mergeContext(request, parsed);

  // Resolving the reference here (rather than inside each handler) means every
  // action sees the same answer to "which one did they mean".
  const resolved = resolveReference(parsed.reference, context);
  if (resolved.ref) context.selection = resolved.ref;

  const actions = planTurn({ request, parsed, context });
  emit({ type: "plan", actions });
  logger.event({ type: "plan", actions });

  const ctx: ActionContext = {
    request,
    parsed,
    context,
    tools,
    emit,
    today: request.today,
    now: new Date(request.nowMs ?? Date.parse(`${request.today}T12:00:00.000Z`)).toISOString(),
    auth: request.auth,
  };

  const merged = await execute(ctx, actions, budget, emit);
  const elapsed = now() - startedAt;

  emit({ type: "complete", ms: elapsed, toolCalls: tools.calls });
  logger.event({ type: "complete", ms: elapsed, toolCalls: tools.calls });

  return {
    text: merged.text,
    blocks: merged.blocks,
    suggestions: merged.suggestions,
    contextPatch: trimContext(merged.contextPatch, policy),
    intent: parsed.intent,
    actions,
    steps: merged.steps,
    bookingState: merged.contextPatch.booking?.state,
    toolCalls: tools.calls,
  };
}

/**
 * Run the planned actions in order, threading the memory between them.
 *
 * Later actions see the *result* of earlier ones — which is what makes
 * "find hotels, then compare them" work as one turn rather than two.
 */
async function execute(
  ctx: ActionContext,
  actions: AgentAction[],
  budget: PolicyBudget,
  emit: (event: AgentEvent) => void,
): Promise<ActionResult> {
  let context = ctx.context;
  const texts: string[] = [];
  const blocks: AIBlock[] = [];
  const steps: AIProgressStep[] = [];
  let suggestions: string[] = [];

  for (const action of actions) {
    if (!budget.canTakeStep()) {
      emit({ type: "error", code: "limit_exceeded", message: "step budget exhausted" });
      break;
    }
    budget.chargeStep();

    let result: ActionResult;
    try {
      result = await runAction({ ...ctx, context }, action);
    } catch (error) {
      result = renderError(toAgentError(error), context);
    }

    context = result.contextPatch;
    if (result.text) texts.push(result.text);
    blocks.push(...result.blocks);
    if (result.steps) steps.push(...result.steps);
    // The last action owns the follow-ups: it is the one the traveller is
    // looking at, and stale chips from an intermediate step read as confusion.
    suggestions = result.suggestions.length ? result.suggestions : suggestions;
  }

  return {
    text: texts.join(" "),
    blocks,
    suggestions,
    contextPatch: context,
    steps: steps.length > 1 ? steps : undefined,
  };
}

/** Dispatch one action to its handler. */
async function runAction(ctx: ActionContext, action: AgentAction): Promise<ActionResult> {
  switch (action.type) {
    case "answer":
      switch (action.intent) {
        case "greet":
          return conversation.greet(ctx);
        case "help":
          return conversation.help(ctx);
        case "set-context":
          return conversation.setContext(ctx);
        default:
          return conversation.fallback(ctx);
      }

    case "search-listings":
      if (ctx.parsed.intent === "refine") return search.refine(ctx);
      if (action.vertical === "stays") return search.searchStays(ctx);
      return search.searchExperiences(ctx, action.vertical);
    case "search-flights":
      return search.searchFlights(ctx);
    case "search-visa":
      return search.visa(ctx);
    case "recommend":
      return search.recommend(ctx);

    case "compare":
      return comparison.compare(ctx);
    case "summarize-reviews":
      return comparison.summarizeReviews(ctx);
    case "plan-trip":
      return planning.planTrip(ctx, action.focus);
    case "list-bookings":
      return accountActions.listBookings(ctx);

    case "select-item":
      return booking.selectItem(ctx, action.ref);

    case "start-booking": {
      const ref = action.ref ?? booking.resolveSubjectRef(ctx).ref;
      if (!ref) return booking.resolveSubjectRef(ctx).problem ?? conversation.fallback(ctx);
      return booking.startBooking(ctx, ref);
    }

    case "collect-booking-info":
      return booking.collectBookingInfo(ctx);
    case "select-payment":
      return booking.selectPayment(ctx, action.methodId);
    case "request-confirmation":
      return booking.requestConfirmation(ctx);
    case "confirm-booking":
      return booking.confirmBooking(ctx);
    case "abandon-booking":
      return booking.abandonBooking(ctx);
    case "cancel-booking":
      return booking.cancelExistingBooking(ctx, action.bookingId, action.confirmed);
    case "modify-booking":
      return booking.modifyExistingBooking(ctx, action.bookingId, action.patch);

    case "validate-booking":
    case "clarify":
    default:
      return conversation.fallback(ctx);
  }
}

/**
 * A failure the traveller can act on.
 *
 * Authentication gets its own affordance rather than an apology, because
 * "sign in" is a thing they can do and "something went wrong" is not.
 */
function renderError(error: AgentError, context: ActionContext["context"]): ActionResult {
  if (error.code === "authentication_required") {
    return {
      text: error.userMessage,
      blocks: [
        {
          kind: "action-required",
          title: "Sign in to continue",
          text: "Your booking stays exactly as it is — I'll pick it straight back up.",
          href: "/login",
          actionLabel: "Sign in",
          tone: "info",
        },
      ],
      suggestions: ["Show me the options again"],
      contextPatch: context,
    };
  }

  return {
    text: error.userMessage,
    blocks: [{ kind: "booking-error", failure: error.toFailure() }],
    suggestions: error.recoverable ? ["Try again", "Show me other options"] : ["Start again"],
    contextPatch: context,
  };
}
