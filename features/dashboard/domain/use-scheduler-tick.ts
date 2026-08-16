"use client";

import { useEffect } from "react";
import { tickScheduler } from "./scheduler";

/** How often the dashboard asks the scheduler whether anything is due. */
const TICK_MS = 60_000;

/**
 * Drives the scheduler while the dashboard is open.
 *
 * This is what makes the platform feel alive without pretending a server cron
 * exists: queued messages progress to delivered, expired holds hand their units
 * back, abandoned checkouts get their nudge, waitlisted travellers are told
 * when dates free up. Every run is recorded on the job, so the Cron screen
 * shows real history.
 *
 * Runs once on mount (so a job that came due while nobody was looking catches
 * up) and then on an interval. Jobs decide their own due-ness, so mounting this
 * twice would still not double-run anything.
 */
export function useSchedulerTick(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    tickScheduler();
    const id = window.setInterval(() => tickScheduler(), TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);
}
