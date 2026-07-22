"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Custom event so same-tab writes notify subscribers (the native `storage`
 * event only fires in *other* tabs). */
const STORAGE_EVENT = "stayora:storage";

/**
 * localStorage-backed state with SSR-safe hydration and no `setState`-in-effect.
 * Built on `useSyncExternalStore`: the server snapshot is the fallback, the
 * client snapshot reads storage, and writes broadcast a custom event so every
 * consumer stays in sync. Used for theme and sidebar-collapse preferences.
 */
export function useStoredState(
  key: string,
  fallback: string,
): [string, (value: string) => void] {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener(STORAGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(STORAGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const getSnapshot = useCallback(
    () => window.localStorage.getItem(key) ?? fallback,
    [key, fallback],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (next: string) => {
      window.localStorage.setItem(key, next);
      window.dispatchEvent(new Event(STORAGE_EVENT));
    },
    [key],
  );

  return [value, setValue];
}

/**
 * Reactive media-query match via `useSyncExternalStore` (SSR-safe, effect-free).
 * Used to resolve the "system" theme preference against the OS setting.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
