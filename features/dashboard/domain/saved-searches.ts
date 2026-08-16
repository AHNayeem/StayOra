/**
 * Saved searches and price alerts.
 *
 * Flights already let a traveller pin a search (`features/flights/saved-searches`),
 * but a stay search was gone the moment the page unmounted, and nothing anywhere
 * watched a price. This module is the stay-side equivalent plus the half that
 * makes it worth saving: an alert that re-runs the search on a schedule and
 * writes to the traveller when the cheapest match falls to their target.
 *
 * It sits in the domain rather than in an account store for one reason — the
 * `alerts:price` job has to re-run these searches without a browser tab open on
 * the page that created them. Same reason `waitlist.ts` lives here, and it
 * follows the same shape: `save` / `list` / `remove` / `sweep`.
 *
 * Matching reuses the public catalogue's own filter (`lib/listing-filter`), so a
 * saved search can never drift from what the listing page would show for the
 * same criteria.
 */

import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import { LISTING_FACETS } from "@/constants/listing";
import { filterListings, type ListingFilterState } from "@/lib/listing-filter";
import { listingsFor } from "./catalogue";
import { isListingLive } from "./catalogue-service";
import { send } from "./messaging";
import { notify } from "./service-kit";
import { getState, mutate, nextId } from "./store";
import type { JobOutcome } from "./scheduler";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The criteria, in the shape the listing page's own filter understands. */
export interface SavedSearchQuery {
  /** Free-text term. */
  search: string;
  minPrice: number;
  maxPrice: number;
  /** facetKey → selected values, exactly as the listing filters hold them. */
  facets: Record<string, string[]>;
}

export type PriceAlertStatus = "watching" | "triggered" | "paused";

export interface PriceAlert {
  /** Notify when the cheapest match is at or below this, base USD. */
  targetUsd: number;
  /** Cheapest match when the alert was set — makes "down 12%" computable. */
  baselineUsd: number;
  status: PriceAlertStatus;
  lastCheckedAt?: string;
  triggeredAt?: string;
  /** Price the last notification quoted, so the same drop isn't sent twice. */
  lastNotifiedUsd?: number;
}

export interface SavedSearch {
  id: string;
  customerEmail: string;
  customerName?: string;
  vertical: BookingVertical;
  /** Human summary, e.g. "Hotels · Dubai · under $220". */
  label: string;
  query: SavedSearchQuery;
  createdAt: string;
  /** Deep link back to the listing page the search came from. */
  href: string;
  alert?: PriceAlert;
  /** Snapshot from the last evaluation, shown on the account screen. */
  lastResultCount: number;
  lastCheapestUsd: number;
  lastRunAt: string;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function rows(): SavedSearch[] {
  return getState().savedSearches ?? [];
}

/** Live listings in a vertical — a saved search never matches an unpublished one. */
function candidates(vertical: BookingVertical): Listing[] {
  return listingsFor(vertical).filter((listing) => isListingLive(listing.id));
}

/** Everything a saved search currently matches, cheapest first. */
export function matchesFor(search: SavedSearch): Listing[] {
  const state: ListingFilterState = {
    search: search.query.search,
    price: { min: search.query.minPrice, max: search.query.maxPrice },
    facets: search.query.facets,
  };
  return filterListings(candidates(search.vertical), state, LISTING_FACETS[search.vertical]).sort(
    (a, b) => a.price.amount - b.price.amount,
  );
}

/** Result count and cheapest price for a search, right now. */
export function evaluate(search: SavedSearch): { count: number; cheapestUsd: number } {
  const matched = matchesFor(search);
  return {
    count: matched.length,
    cheapestUsd: matched[0]?.price.amount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface SaveSearchInput {
  customerEmail: string;
  customerName?: string;
  vertical: BookingVertical;
  label: string;
  query: SavedSearchQuery;
  href: string;
  /** Set a price alert at the same time. Omit to just save the search. */
  targetUsd?: number;
}

/**
 * Stable identity for a set of criteria, so saving the same search twice
 * refreshes it rather than filling the list with near-duplicates.
 */
function fingerprint(email: string, vertical: string, query: SavedSearchQuery): string {
  const facets = Object.entries(query.facets)
    .filter(([, values]) => values.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => `${key}=${[...values].sort().join("+")}`)
    .join(";");
  return [
    email.toLowerCase(),
    vertical,
    query.search.trim().toLowerCase(),
    query.minPrice,
    query.maxPrice,
    facets,
  ].join("|");
}

const byFingerprint = new Map<string, string>();

/** Save (or refresh) a search. Returns the stored record. */
export function saveSearch(input: SaveSearchInput, nowMs = Date.now()): SavedSearch {
  const at = new Date(nowMs).toISOString();
  const print = fingerprint(input.customerEmail, input.vertical, input.query);
  const existingId =
    byFingerprint.get(print) ??
    rows().find(
      (row) => fingerprint(row.customerEmail, row.vertical, row.query) === print,
    )?.id;

  const draft: SavedSearch = {
    id: existingId ?? nextId("sch"),
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    vertical: input.vertical,
    label: input.label,
    query: input.query,
    createdAt: at,
    href: input.href,
    lastResultCount: 0,
    lastCheapestUsd: 0,
    lastRunAt: at,
  };
  const snapshot = evaluate(draft);
  draft.lastResultCount = snapshot.count;
  draft.lastCheapestUsd = snapshot.cheapestUsd;

  if (input.targetUsd !== undefined && input.targetUsd > 0) {
    draft.alert = {
      targetUsd: Math.round(input.targetUsd * 100) / 100,
      baselineUsd: snapshot.cheapestUsd,
      status: "watching",
      lastCheckedAt: at,
    };
  }

  mutate((state) => {
    state.savedSearches ??= [];
    const index = state.savedSearches.findIndex((row) => row.id === draft.id);
    if (index >= 0) {
      // Keep the original creation date and any alert the traveller already set.
      const existing = state.savedSearches[index];
      state.savedSearches[index] = {
        ...draft,
        createdAt: existing.createdAt,
        alert: draft.alert ?? existing.alert,
      };
    } else {
      state.savedSearches.unshift(draft);
    }
  });

  byFingerprint.set(print, draft.id);
  return rows().find((row) => row.id === draft.id) ?? draft;
}

/** A traveller's saved searches, newest first. */
export function savedSearchesFor(email: string): SavedSearch[] {
  return rows()
    .filter((row) => row.customerEmail.toLowerCase() === email.toLowerCase())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function removeSavedSearch(id: string): void {
  mutate((state) => {
    state.savedSearches = (state.savedSearches ?? []).filter((row) => row.id !== id);
  });
}

/**
 * Set or move a price alert on an existing search. Re-arms a triggered alert:
 * the traveller has seen the drop, and the new target is what they want next.
 */
export function setPriceAlert(id: string, targetUsd: number, nowMs = Date.now()): SavedSearch | undefined {
  const search = rows().find((row) => row.id === id);
  if (!search) return undefined;
  const snapshot = evaluate(search);
  mutate((state) => {
    const row = state.savedSearches?.find((r) => r.id === id);
    if (!row) return;
    row.alert = {
      targetUsd: Math.round(Math.max(1, targetUsd) * 100) / 100,
      baselineUsd: snapshot.cheapestUsd || row.lastCheapestUsd,
      status: "watching",
      lastCheckedAt: new Date(nowMs).toISOString(),
    };
    row.lastResultCount = snapshot.count;
    row.lastCheapestUsd = snapshot.cheapestUsd;
  });
  return rows().find((row) => row.id === id);
}

export function setAlertStatus(id: string, status: PriceAlertStatus): SavedSearch | undefined {
  mutate((state) => {
    const row = state.savedSearches?.find((r) => r.id === id);
    if (row?.alert) row.alert.status = status;
  });
  return rows().find((row) => row.id === id);
}

export function clearPriceAlert(id: string): void {
  mutate((state) => {
    const row = state.savedSearches?.find((r) => r.id === id);
    if (row) delete row.alert;
  });
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

/** Percentage drop from the alert's baseline, for the notification copy. */
export function dropPercent(alert: PriceAlert, cheapestUsd: number): number {
  if (!alert.baselineUsd || cheapestUsd <= 0) return 0;
  return Math.max(0, Math.round(((alert.baselineUsd - cheapestUsd) / alert.baselineUsd) * 100));
}

/**
 * Re-run every watching alert and write to the travellers whose target has been
 * met. Driven by the `alerts:price` job.
 *
 * An alert fires once per price: `lastNotifiedUsd` stops the same drop being
 * mailed on every tick, but a *further* fall re-notifies, which is the
 * behaviour a traveller actually wants.
 */
export function sweepPriceAlerts(nowMs = Date.now()): JobOutcome {
  const at = new Date(nowMs).toISOString();
  let notified = 0;
  let checked = 0;

  for (const search of rows()) {
    const alert = search.alert;
    if (!alert || alert.status === "paused") continue;
    checked += 1;

    const snapshot = evaluate(search);
    const hit =
      snapshot.count > 0 &&
      snapshot.cheapestUsd > 0 &&
      snapshot.cheapestUsd <= alert.targetUsd &&
      (alert.lastNotifiedUsd === undefined || snapshot.cheapestUsd < alert.lastNotifiedUsd);

    mutate((state) => {
      const row = state.savedSearches?.find((r) => r.id === search.id);
      if (!row?.alert) return;
      row.lastResultCount = snapshot.count;
      row.lastCheapestUsd = snapshot.cheapestUsd;
      row.lastRunAt = at;
      row.alert.lastCheckedAt = at;
      if (hit) {
        row.alert.status = "triggered";
        row.alert.triggeredAt = at;
        row.alert.lastNotifiedUsd = snapshot.cheapestUsd;
      }
    });

    if (!hit) continue;

    const cheapest = matchesFor(search)[0];
    send({
      templateKey: "price_alert",
      to: { email: search.customerEmail },
      customerEmail: search.customerEmail,
      href: search.href,
      nowMs,
      context: {
        name: (search.customerName ?? "there").split(" ")[0],
        search: search.label,
        price: `$${snapshot.cheapestUsd.toFixed(0)}`,
        target: `$${alert.targetUsd.toFixed(0)}`,
        drop: `${dropPercent(alert, snapshot.cheapestUsd)}%`,
        product: cheapest?.title ?? "a match",
      },
    });
    notify({
      category: "system",
      audience: ["customer"],
      title: `Price alert: ${search.label}`,
      body: `Now from $${snapshot.cheapestUsd.toFixed(0)} — at or below your $${alert.targetUsd.toFixed(0)} target.`,
      href: search.href,
      tone: "success",
    });
    notified += 1;
  }

  return {
    affected: notified,
    summary: checked
      ? `${checked} alert${checked === 1 ? "" : "s"} checked, ${notified} triggered`
      : "No price alerts set",
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const savedSearchService = {
  save: saveSearch,
  forCustomer: savedSearchesFor,
  all: (): SavedSearch[] => [...rows()],
  remove: removeSavedSearch,
  setAlert: setPriceAlert,
  setAlertStatus,
  clearAlert: clearPriceAlert,
  matches: matchesFor,
  evaluate,
  sweep: sweepPriceAlerts,
  stats() {
    const all = rows();
    const alerts = all.filter((row) => row.alert);
    return {
      total: all.length,
      watching: alerts.filter((row) => row.alert?.status === "watching").length,
      triggered: alerts.filter((row) => row.alert?.status === "triggered").length,
      paused: alerts.filter((row) => row.alert?.status === "paused").length,
    };
  },
};
