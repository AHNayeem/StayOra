"use client";

import type { AITripPlan } from "@/types/ai";
import { createCollectionStore } from "@/features/account/collection-store";

/**
 * Saved trips — plans the traveller kept, persisted client-side with the same
 * store primitive the wishlist and saved cards use, so behaviour (SSR-safe
 * reads, cross-tab sync, no `setState`-in-effect) is identical.
 *
 * A real backend replaces this with `POST /me/trips`; the hooks below stay.
 */

/** A saved plan plus the prompt that reproduces it. */
export interface SavedTrip {
  id: string;
  /** Human title, e.g. "5-day Dubai trip". */
  title: string;
  destination: string;
  nights: number;
  totalUsd: number;
  /** The natural-language prompt that rebuilds this plan. */
  prompt: string;
  /** ISO date the trip starts, when the plan had dates. */
  startDate?: string;
}

const store = createCollectionStore<SavedTrip>({
  key: "otithee:ai-trips",
  getId: (trip) => trip.id,
  seed: () => [],
});

/** Reactive list of saved trips, newest first. */
export const useSavedTrips = store.useAll;
export const useSavedTripCount = store.useCount;

/** Save (or refresh) a trip. Returns false when it was already saved. */
export function saveTrip(trip: SavedTrip): boolean {
  const existed = store.has(trip.id);
  store.add(trip);
  return !existed;
}

export function removeSavedTrip(id: string): void {
  store.remove(id);
}

/**
 * The prompt that reproduces a plan.
 *
 * Because the engine and every tool are deterministic, replaying this sentence
 * rebuilds the identical itinerary — which is what makes a saved or shared trip
 * a real link rather than a screenshot.
 */
export function promptForPlan(plan: AITripPlan): string {
  const party = plan.travelers.adults + plan.travelers.children;
  const parts = [
    `Plan a ${plan.days.length}-day trip to ${plan.destination}`,
    party > 1 ? `for ${plan.travelers.adults} adults` : "for 1 adult",
    plan.travelers.children > 0 ? `and ${plan.travelers.children} children` : "",
    plan.startDate ? `departing ${plan.startDate}` : "",
    plan.originCode ? `from ${plan.originCode}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/** Build a {@link SavedTrip} from a plan. */
export function tripFromPlan(plan: AITripPlan): SavedTrip {
  return {
    id: plan.id,
    title: `${plan.days.length}-day ${plan.destination} trip`,
    destination: plan.destination,
    nights: plan.nights,
    totalUsd: plan.totalUsd,
    prompt: promptForPlan(plan),
    startDate: plan.startDate,
  };
}
