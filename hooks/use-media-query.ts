"use client";

import { useSyncExternalStore } from "react";

/**
 * useMediaQuery — subscribe to a CSS media query.
 *
 * Uses `useSyncExternalStore` rather than `useState` + `useEffect` so there is
 * no post-hydration flash and no `setState`-in-effect, matching the pattern the
 * locale and collection stores already use. During SSR it reports `false`, so
 * callers should treat the small-screen layout as the safe default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True from Tailwind's `md` breakpoint (768px) up. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
