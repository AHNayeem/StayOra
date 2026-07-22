"use client";

import { useSyncExternalStore } from "react";

/**
 * Account settings — communication + preference toggles, persisted client-side.
 * A small object store (single JSON blob) with the same SSR-safe
 * `useSyncExternalStore` pattern as the other account stores.
 */
export interface AccountSettings {
  emailBookingUpdates: boolean;
  emailPromotions: boolean;
  emailNewsletter: boolean;
  pushMessages: boolean;
  pushDeals: boolean;
  smsReminders: boolean;
  currencyAutoDetect: boolean;
}

export const DEFAULT_SETTINGS: AccountSettings = {
  emailBookingUpdates: true,
  emailPromotions: true,
  emailNewsletter: false,
  pushMessages: true,
  pushDeals: false,
  smsReminders: false,
  currencyAutoDetect: true,
};

const KEY = "stayora:settings";
const EVENT = "stayora:settings:change";

let snapshot: AccountSettings = DEFAULT_SETTINGS;
let hydrated = false;

function read(): AccountSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AccountSettings>) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function getSnapshot(): AccountSettings {
  if (!hydrated) {
    snapshot = read();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): AccountSettings {
  return DEFAULT_SETTINGS;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setSetting(key: keyof AccountSettings, value: boolean): void {
  snapshot = { ...getSnapshot(), [key]: value };
  hydrated = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSettings(): AccountSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
