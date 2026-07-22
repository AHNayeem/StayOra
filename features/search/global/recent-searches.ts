"use client";

import { useSyncExternalStore } from "react";

/**
 * recent-searches — a tiny localStorage-backed store for the visitor's last few
 * search terms. Follows the same module-singleton + `useSyncExternalStore`
 * pattern as the locale/session stores so reads are SSR-safe and never trigger
 * a `setState`-in-effect.
 */

const KEY = "stayora:recent-searches";
const EVENT = "stayora:recent-searches-change";
const MAX = 6;

let snapshot: string[] = [];
let hydrated = false;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): string[] {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): string[] {
  return [];
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function commit(next: string[]): void {
  snapshot = next.slice(0, MAX);
  hydrated = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable — recents just won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Add a term to the front (de-duplicated, case-insensitively), capped at MAX. */
export function pushRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (!trimmed) return;
  const lower = trimmed.toLowerCase();
  const next = [trimmed, ...getSnapshot().filter((t) => t.toLowerCase() !== lower)];
  commit(next);
}

export function clearRecentSearches(): void {
  commit([]);
}

/** Reactive list of recent search terms (empty during SSR / first paint). */
export function useRecentSearches(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
