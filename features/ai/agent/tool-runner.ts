/**
 * The tool runner — every call the agent makes passes through here.
 *
 * One choke point buys four guarantees that would otherwise have to be
 * re-established at each of thirty call sites:
 *
 *  - **Permission.** A `write` tool needs a signed-in traveller; a
 *    `destructive` one needs an explicit confirmation raised in this same turn.
 *  - **Budget.** Tool calls are counted and capped, so no plan (or, later, no
 *    model) can loop up an unbounded bill.
 *  - **Observability.** Start, duration and outcome are emitted as agent events
 *    with traveller data redacted.
 *  - **Error shape.** Anything a tool throws leaves as an {@link AgentError}
 *    with a traveller-safe message, so no internal string can reach an answer.
 *
 * A future LLM provider gets the same object. That is what stops it bypassing
 * the tool layer: it has no other way to reach the data, and no way to reach
 * these tools except with the permissions checked.
 */

import type { AIAuthContext, AgentEvent } from "@/types/ai";
import { AI_TOOLS, permissionOf, type AIToolName } from "../tools";
import { AgentError, toAgentError } from "./errors";
import type { AgentLogger } from "./logger";
import type { PolicyBudget } from "./policy";

export interface ToolRunnerOptions {
  budget: PolicyBudget;
  logger: AgentLogger;
  emit: (event: AgentEvent) => void;
  auth?: AIAuthContext;
  /** Elapsed-time source, injected so the engine never reads the clock itself. */
  now: () => number;
}

/** Options for one call, not for the runner. */
export interface CallOptions {
  /**
   * The traveller explicitly authorised this destructive action *this turn*.
   * A remembered "yes" from an earlier turn does not count — that is the whole
   * point of the flag.
   */
  confirmed?: boolean;
}

export class ToolRunner {
  private callCount = 0;

  constructor(private readonly options: ToolRunnerOptions) {}

  get calls(): number {
    return this.callCount;
  }

  /**
   * Invoke a tool by name with its own argument types.
   *
   * The single cast below is the price of a dynamic registry; it is contained
   * to this one line, and every caller above it stays fully typed because the
   * signature is derived from `AI_TOOLS` itself.
   */
  async call<K extends AIToolName>(
    name: K,
    args: Parameters<(typeof AI_TOOLS)[K]>,
    options: CallOptions = {},
  ): Promise<Awaited<ReturnType<(typeof AI_TOOLS)[K]>>> {
    this.authorize(name, options);

    if (!this.options.budget.canCallTool()) {
      throw new AgentError(
        "limit_exceeded",
        "That needs more steps than I can take in one go. Try narrowing it down.",
        { recoverable: false },
      );
    }
    this.options.budget.chargeToolCall();
    this.callCount += 1;

    const started = this.options.now();
    this.event({ type: "tool_start", tool: name, input: summarizeInput(args) });

    try {
      const fn = AI_TOOLS[name] as (...a: unknown[]) => unknown;
      const result = await fn(...(args as unknown[]));
      this.event({
        type: "tool_result",
        tool: name,
        ms: this.options.now() - started,
        summary: summarizeResult(result),
      });
      return result as Awaited<ReturnType<(typeof AI_TOOLS)[K]>>;
    } catch (error) {
      const agentError = toAgentError(error, name);
      this.event({
        type: "tool_error",
        tool: name,
        code: agentError.code,
        message: agentError.userMessage,
      });
      throw agentError;
    }
  }

  /** Guardrail check, extracted so it can be exercised on its own in tests. */
  private authorize(name: AIToolName, options: CallOptions): void {
    const permission = permissionOf(name);
    if (permission === "read") return;

    if (!this.options.auth?.authenticated) {
      throw new AgentError(
        "authentication_required",
        "You'll need to sign in before I can do that — it changes a real booking.",
        { recoverable: false, retryLabel: "Sign in" },
      );
    }
    if (permission === "destructive" && !options.confirmed) {
      throw new AgentError(
        "validation_failed",
        "That one is irreversible, so I need you to confirm it explicitly first.",
        { recoverable: true },
      );
    }
  }

  private event(event: AgentEvent): void {
    this.options.logger.event(event);
    this.options.emit(event);
  }
}

/** Argument shape for the log — names and counts only, never values. */
function summarizeInput(args: unknown[]): unknown {
  const [first] = args;
  if (first === null || typeof first !== "object") return { args: args.length };
  return { keys: Object.keys(first as Record<string, unknown>) };
}

/** A one-line description of what came back, safe to print. */
function summarizeResult(result: unknown): string | undefined {
  if (Array.isArray(result)) return `${result.length} items`;
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (Array.isArray(record.items)) return `${record.items.length} items`;
    if (typeof record.available === "boolean") return `available=${record.available}`;
    if (typeof record.ok === "boolean") return `ok=${record.ok}`;
    if (typeof record.state === "string") return `state=${record.state}`;
  }
  return undefined;
}
