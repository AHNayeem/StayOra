"use client";

import { useCallback, useState } from "react";
import { DEMO_ORIGIN, nearestPlace, type GeoOrigin } from "./geo";

/**
 * Prototype geolocation.
 *
 * Nothing here runs on mount — the browser is only asked for a position when
 * the traveller presses "Near me", which keeps the render tree identical on the
 * server and the client and avoids an unprompted permission dialog.
 *
 * Every failure path (no `navigator.geolocation`, permission denied, timeout,
 * position unavailable) resolves to the same place: the demo origin, with the
 * reason kept in `status` so the UI can say *why* it fell back rather than
 * silently pretending the traveller is in Paris.
 */
export type NearMeStatus =
  | "idle"
  | "locating"
  | "located"
  | "denied"
  | "unsupported"
  | "unavailable";

export interface NearMeState {
  status: NearMeStatus;
  /** Resolved origin — real when `status === "located"`, demo otherwise. */
  origin: GeoOrigin | null;
  /** True when `origin` is the demo fallback rather than a real fix. */
  usingFallback: boolean;
}

const IDLE: NearMeState = { status: "idle", origin: null, usingFallback: false };

/** Human-readable explanation for each non-success status. */
export const NEAR_ME_MESSAGE: Record<NearMeStatus, string> = {
  idle: "",
  locating: "Finding your location…",
  located: "",
  denied: "Location permission was declined — showing results near the demo location instead.",
  unsupported: "This browser can't share a location — showing results near the demo location instead.",
  unavailable: "Your location couldn't be determined — showing results near the demo location instead.",
};

export function useNearMe() {
  const [state, setState] = useState<NearMeState>(IDLE);

  const locate = useCallback(() => {
    // Guarded rather than assumed: this runs in an event handler, but the guard
    // is what makes the hook safe to import from a server-rendered tree.
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unsupported", origin: DEMO_ORIGIN, usingFallback: true });
      return;
    }

    setState({ status: "locating", origin: null, usingFallback: false });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setState({
          status: "located",
          origin: { ...point, label: nearestPlace(point) },
          usingFallback: false,
        });
      },
      (error) => {
        setState({
          status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
          origin: DEMO_ORIGIN,
          usingFallback: true,
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  /** Adopt a named origin directly (the "use a demo location" escape hatch). */
  const useOrigin = useCallback((origin: GeoOrigin) => {
    setState({ status: "located", origin, usingFallback: true });
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, locate, useOrigin, reset };
}
