"use client";

import { useEffect } from "react";

/**
 * Boots the LocatorJS overlay in development.
 *
 * Hold Option (Alt) and hover any element to see its component, then click to
 * jump straight to the JSX in VS Code. The file/line data comes from the
 * `data-locatorjs` attributes that `@locator/babel-jsx` stamps on every JSX
 * element (see the Turbopack rule in `next.config.ts`), which is why the
 * adapter is `jsx` rather than `react` — React 19 no longer carries source
 * locations on its fibers.
 *
 * The import is dynamic and behind a `NODE_ENV` check so nothing from
 * LocatorJS reaches a production bundle.
 */
export function LocatorInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }
    void import("@locator/runtime").then(({ default: setup }) => {
      setup({ adapter: "jsx" });
    });
  }, []);

  return null;
}
