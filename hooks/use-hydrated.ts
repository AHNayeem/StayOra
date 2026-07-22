"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * True once the component has hydrated on the client, false during SSR and the
 * first client render. Built on `useSyncExternalStore` so it never triggers a
 * `setState`-in-effect — use it to gate client-only decisions (e.g. redirecting
 * an unauthenticated visitor) until the persisted session has been read.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
