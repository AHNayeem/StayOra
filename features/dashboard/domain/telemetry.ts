/**
 * Prototype observability — the seam a real provider plugs into.
 *
 * `track` is the product-analytics call (PostHog/Amplitude/GA4), `captureError`
 * is the error reporter (Sentry), and `logEvent` is structured logging. Today
 * all three append to a capped ring buffer in the domain store, which is what
 * powers the funnel numbers on the analytics dashboard — so the funnel is built
 * from events the prototype genuinely emitted, not from a static chart.
 *
 * Swapping in a provider means changing only the three `emit*` bodies.
 */

import { getState, mutate } from "./store";

/** Keep the buffer small enough to persist comfortably in localStorage. */
const MAX_EVENTS = 500;

export const FUNNEL_STEPS = [
  "search_performed",
  "listing_viewed",
  "availability_checked",
  "checkout_started",
  "payment_attempted",
  "booking_confirmed",
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  search_performed: "Searched",
  listing_viewed: "Viewed a listing",
  availability_checked: "Checked availability",
  checkout_started: "Started checkout",
  payment_attempted: "Attempted payment",
  booking_confirmed: "Booked",
};

export type EventLevel = "info" | "warn" | "error";

export interface TelemetryEvent {
  id: string;
  at: string;
  /** Event name — funnel steps use {@link FunnelStep} values. */
  name: string;
  level: EventLevel;
  props: Record<string, string | number | boolean | undefined>;
  /** Who was acting, when known. */
  actor?: string;
  sessionId?: string;
}

let sequence = 0;
/** Stable per-tab session id, assigned lazily so SSR never generates one. */
let sessionId: string | undefined;

function currentSession(): string | undefined {
  if (typeof window === "undefined") return undefined;
  sessionId ??= `ses_${Math.abs(Math.round(performance.now() * 1000))}`;
  return sessionId;
}

function emit(event: Omit<TelemetryEvent, "id" | "at" | "sessionId">): void {
  sequence += 1;
  const entry: TelemetryEvent = {
    ...event,
    id: `evt_${sequence}_${event.name}`,
    at: new Date().toISOString(),
    sessionId: currentSession(),
  };
  mutate((draft) => {
    draft.telemetry.unshift(entry);
    if (draft.telemetry.length > MAX_EVENTS) draft.telemetry.length = MAX_EVENTS;
  });
}

/** Product analytics. Safe to call from render-adjacent event handlers. */
export function track(
  name: FunnelStep | string,
  props: TelemetryEvent["props"] = {},
  actor?: string,
): void {
  emit({ name, level: "info", props, actor });
}

/** Error reporting. `context` is the structured breadcrumb payload. */
export function captureError(
  error: unknown,
  context: TelemetryEvent["props"] = {},
  actor?: string,
): void {
  const message = error instanceof Error ? error.message : String(error);
  emit({
    name: "error",
    level: "error",
    props: { message, name: error instanceof Error ? error.name : "Error", ...context },
    actor,
  });
}

/** Structured log line — the "warn about something odd" channel. */
export function logEvent(
  name: string,
  props: TelemetryEvent["props"] = {},
  level: EventLevel = "warn",
): void {
  emit({ name, level, props });
}

export const telemetryService = {
  track,
  captureError,
  logEvent,

  all(): TelemetryEvent[] {
    return getState().telemetry;
  },

  errors(): TelemetryEvent[] {
    return getState().telemetry.filter((e) => e.level === "error");
  },

  /**
   * Booking funnel from real emitted events, restricted to a date window.
   * Each step counts distinct sessions, so one user refreshing doesn't inflate
   * the top of the funnel.
   */
  funnel(range?: { from?: string; to?: string }) {
    const rows = getState().telemetry.filter((e) => {
      if (range?.from && e.at < range.from) return false;
      if (range?.to && e.at > range.to) return false;
      return true;
    });

    const counts = FUNNEL_STEPS.map((step) => {
      const sessions = new Set(
        rows.filter((e) => e.name === step).map((e) => e.sessionId ?? e.id),
      );
      return { step, label: FUNNEL_LABELS[step], count: sessions.size };
    });

    const top = counts[0]?.count ?? 0;
    return counts.map((row, index) => ({
      ...row,
      /** Share of the top of the funnel. */
      rate: top ? Math.round((row.count / top) * 1000) / 10 : 0,
      /** Share of the previous step — where the drop-off actually happened. */
      stepRate:
        index === 0 || !counts[index - 1].count
          ? 100
          : Math.round((row.count / counts[index - 1].count) * 1000) / 10,
    }));
  },

  clear(): void {
    mutate((draft) => {
      draft.telemetry = [];
    });
  },
};
