/**
 * Agent policy — the cost and safety envelope one turn runs inside.
 *
 * The mock engine can't run up a bill, but the *shape* of the limit has to
 * exist before a real model is connected, otherwise a retry loop or a
 * pathological plan becomes an invoice. Enforcing them against the deterministic
 * engine now means the limits are exercised in tests rather than discovered in
 * production.
 *
 * Every limit is per-turn unless stated. They are data, not constants scattered
 * through the code, so a provider can tighten them (a real LLM would) without
 * touching the orchestrator.
 */

export interface AgentPolicy {
  /** Hard ceiling on tool invocations in one turn. */
  maxToolCalls: number;
  /** Hard ceiling on planner-produced actions in one turn. */
  maxAgentSteps: number;
  /** Times a failed tool call may be retried. */
  maxRetries: number;
  /**
   * Bytes of conversation memory carried between turns. Exceeding it trims the
   * oldest non-essential fields rather than failing — a booking in progress is
   * never dropped.
   */
  maxContextBytes: number;
  /** Wall-clock budget for one turn, ms. */
  timeoutMs: number;
  /** Payment attempts allowed against one booking before the agent stops. */
  maxPaymentAttempts: number;
}

export const DEFAULT_AGENT_POLICY: AgentPolicy = {
  maxToolCalls: 12,
  maxAgentSteps: 8,
  maxRetries: 1,
  maxContextBytes: 32_000,
  timeoutMs: 20_000,
  maxPaymentAttempts: 3,
};

/** Tracks a single turn's consumption against the policy. */
export class PolicyBudget {
  private toolCalls = 0;
  private steps = 0;

  constructor(
    readonly policy: AgentPolicy,
    /** Turn start in ms; injected so the engine stays clock-free. */
    private readonly startedAtMs: number,
    private readonly now: () => number,
  ) {}

  get toolCallCount(): number {
    return this.toolCalls;
  }

  /** True when another tool call is allowed. */
  canCallTool(): boolean {
    return this.toolCalls < this.policy.maxToolCalls && !this.timedOut();
  }

  chargeToolCall(): void {
    this.toolCalls += 1;
  }

  canTakeStep(): boolean {
    return this.steps < this.policy.maxAgentSteps && !this.timedOut();
  }

  chargeStep(): void {
    this.steps += 1;
  }

  timedOut(): boolean {
    return this.now() - this.startedAtMs > this.policy.timeoutMs;
  }
}

/**
 * Trim conversation memory to the policy's size budget.
 *
 * Drops the *replaceable* first — a stale result list can be re-fetched, an
 * in-flight booking cannot — so a long session degrades into forgetfulness
 * rather than into a lost booking.
 */
export function trimContext<T extends object>(
  context: T,
  policy: AgentPolicy = DEFAULT_AGENT_POLICY,
): T {
  const size = (value: unknown) => JSON.stringify(value ?? null).length;
  if (size(context) <= policy.maxContextBytes) return context;

  const next = { ...context } as Record<string, unknown>;
  for (const key of ["lastResults", "preferences", "recentBookingIds", "travelerDetails"]) {
    if (size(next) <= policy.maxContextBytes) break;
    delete next[key];
  }
  return next as T;
}
