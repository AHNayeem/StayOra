/**
 * Structured agent logging.
 *
 * Off in production by default and off in tests unless asked for, because an
 * agent that narrates every tool call into a shared console is noise, not
 * observability. Enable with `NEXT_PUBLIC_AI_DEBUG=1`.
 *
 * The redaction rule is the interesting part: log lines carry *shapes and
 * counts*, never traveller identity or payment detail. Knowing that
 * `confirmBooking` ran in 240 ms and returned `ok` is what debugging needs;
 * knowing whose card it was is not.
 */

import type { AgentEvent } from "@/types/ai";

const ENABLED =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_AI_DEBUG === "1" || process.env.AI_DEBUG === "1");

/** Field names that must never be printed, at any depth. */
const REDACTED = new Set([
  "email",
  "phone",
  "fullName",
  "passportNumber",
  "last4",
  "customerEmail",
  "contact",
  "travelers",
  "reference",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED.has(key) ? "«redacted»" : redact(item, depth + 1);
  }
  return out;
}

export interface AgentLogger {
  readonly enabled: boolean;
  event(event: AgentEvent): void;
}

/** One logger per turn, so lines from concurrent turns stay attributable. */
export function createLogger(turnId: string): AgentLogger {
  if (!ENABLED) {
    return { enabled: false, event: () => {} };
  }
  return {
    enabled: true,
    event(event) {
      const { type, ...rest } = event;
      console.info(`[ai:${turnId}] ${type}`, redact(rest));
    },
  };
}
