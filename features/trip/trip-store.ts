"use client";

import { useSyncExternalStore } from "react";
import type { TripCart, TripContext, TripItem, TripTravelers } from "@/types/trip";

/**
 * The trip cart — one travel context plus the products chosen against it.
 *
 * Deliberately a *single object* store rather than a collection: the context is
 * the thing that must not be duplicated across components. A flight selected on
 * `/flights` teaches the hotel rail on `/hotels` where and when the traveller
 * is going, because both read from here.
 *
 * Same conventions as the account stores it sits beside
 * ({@link "@/features/account/collection-store"}): a module singleton read
 * through `useSyncExternalStore`, hydrated from localStorage on first client
 * read, SSR-safe via a stable server snapshot. A real backend swaps the reads
 * and writes for `/me/trip` calls; every hook below keeps its signature.
 */

const STORAGE_KEY = "otithee:trip-cart";
const EVENT = `${STORAGE_KEY}:change`;

const DEFAULT_TRAVELERS: TripTravelers = { adults: 1, children: 0, infants: 0 };

/** An empty cart. `updatedAt` is empty until the traveller actually touches it. */
function emptyCart(): TripCart {
  return {
    context: {
      travelers: DEFAULT_TRAVELERS,
      tripType: "one-way",
      currency: "USD",
      updatedAt: "",
    },
    items: [],
  };
}

let snapshot: TripCart | null = null;
let serverSnapshot: TripCart | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read(): TripCart {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TripCart>;
      if (parsed && Array.isArray(parsed.items) && parsed.context) {
        return { ...emptyCart(), ...parsed } as TripCart;
      }
    }
  } catch {
    /* corrupt payload — start clean */
  }
  return emptyCart();
}

function getSnapshot(): TripCart {
  if (!snapshot) snapshot = isBrowser() ? read() : emptyCart();
  return snapshot;
}

/** Stable reference across SSR renders (avoids an infinite `useSES` loop). */
function getServerSnapshot(): TripCart {
  serverSnapshot ??= emptyCart();
  return serverSnapshot;
}

function subscribe(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function commit(next: TripCart): void {
  snapshot = next;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the trip just won't survive a reload */
  }
  window.dispatchEvent(new Event(EVENT));
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/** The whole cart, reactively. */
export function useTripCart(): TripCart {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Just the travel context — what recommendations are derived from. */
export function useTripContext(): TripContext {
  return useTripCart().context;
}

/** Number of products in the trip (drives the header badge). */
export function useTripItemCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().items.length,
    () => 0,
  );
}

/** Non-reactive read, for event handlers. */
export function getTripCart(): TripCart {
  return getSnapshot();
}

/** Is this product already in the trip? */
export function useIsInTrip(itemId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().items.some((i) => i.id === itemId),
    () => false,
  );
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Merge new facts into the travel context.
 *
 * Merge, never replace: selecting a hotel after a flight must not blank the
 * origin airport the flight established. Explicit `undefined` values are
 * ignored for the same reason.
 */
export function updateTripContext(patch: Partial<TripContext>, nowIso: string): void {
  const cart = getSnapshot();
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<TripContext>;

  commit({
    ...cart,
    context: { ...cart.context, ...defined, updatedAt: nowIso },
  });
}

/** Add a product to the trip (replacing the same product if it's already in). */
export function addTripItem(item: TripItem): void {
  const cart = getSnapshot();
  const rest = cart.items.filter((i) => i.id !== item.id);
  commit({ ...cart, items: [...rest, item] });
}

/** Add several products at once — used when a bundle is applied. */
export function addTripItems(items: TripItem[]): void {
  const cart = getSnapshot();
  const ids = new Set(items.map((i) => i.id));
  commit({ ...cart, items: [...cart.items.filter((i) => !ids.has(i.id)), ...items] });
}

export function removeTripItem(itemId: string): void {
  const cart = getSnapshot();
  commit({ ...cart, items: cart.items.filter((i) => i.id !== itemId) });
}

/** Patch one item (quantity, dates) and re-derive its subtotal. */
export function updateTripItem(itemId: string, patch: Partial<TripItem>): void {
  const cart = getSnapshot();
  commit({
    ...cart,
    items: cart.items.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, ...patch };
      next.subtotalUsd =
        Math.round(next.unitPriceUsd * next.units * next.quantity * 100) / 100;
      return next;
    }),
  });
}

/** Record the bundle the traveller applied (or clear it). */
export function setTripCombo(combo: { id: string; name: string } | null): void {
  const cart = getSnapshot();
  commit({
    ...cart,
    comboId: combo?.id,
    comboName: combo?.name,
  });
}

/** Empty the trip — after checkout, or when the traveller starts over. */
export function clearTrip(): void {
  commit(emptyCart());
}

/** Drop the products but keep the travel context (used after booking). */
export function clearTripItems(): void {
  const cart = getSnapshot();
  commit({ ...cart, items: [], comboId: undefined, comboName: undefined });
}
