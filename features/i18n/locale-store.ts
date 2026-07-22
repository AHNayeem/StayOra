"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Locale preferences store — language, currency and country the visitor has
 * chosen. Backed by localStorage and exposed through `useSyncExternalStore`
 * (no `setState`-in-effect), so it hydrates SSR-safely and every consumer
 * — switchers, price tags, date labels — stays in sync across the tab.
 *
 * A real app would seed these from the user's profile / Accept-Language; here
 * the shape is identical, so swapping the source later is trivial.
 */

export interface LocalePreferences {
  /** BCP-47 language code, e.g. "en". */
  language: string;
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US". */
  country: string;
}

export const DEFAULT_PREFERENCES: LocalePreferences = {
  language: "en",
  currency: "USD",
  country: "US",
};

const STORAGE_KEY = "stayora:locale";
const EVENT = "stayora:locale-change";

/** Reference-stable snapshot; only replaced when a value actually changes. */
let snapshot: LocalePreferences = DEFAULT_PREFERENCES;
let hydrated = false;

function readStorage(): LocalePreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<LocalePreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getSnapshot(): LocalePreferences {
  if (!hydrated) {
    snapshot = readStorage();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): LocalePreferences {
  return DEFAULT_PREFERENCES;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Merge a patch into preferences, persist it, and notify subscribers. */
export function setPreferences(patch: Partial<LocalePreferences>): void {
  const next = { ...getSnapshot(), ...patch };
  snapshot = next; // new reference → useSyncExternalStore re-renders
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode) — state still updates in-memory */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Subscribe to locale preferences. */
export function useLocalePreferences(): LocalePreferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Stable setter callbacks for the switchers. */
export function useSetLocale() {
  return {
    setLanguage: useCallback(
      (language: string) => setPreferences({ language }),
      [],
    ),
    setCurrency: useCallback(
      (currency: string) => setPreferences({ currency }),
      [],
    ),
    setCountry: useCallback((country: string) => setPreferences({ country }), []),
  };
}
