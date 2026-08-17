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

/**
 * True from Tailwind's `xl` breakpoint (1280px) up — the point where the site
 * header shows its full primary nav and drops the hamburger. Keep this in step
 * with the `xl:` variants in SiteHeader/MobileDrawer: a mismatch leaves a band
 * of widths where the trigger is visible but the drawer is not.
 */
export function useIsDesktopNav(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}
