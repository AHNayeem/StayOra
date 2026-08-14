"use client";

import dynamic from "next/dynamic";
import { useFlightCompareIds } from "../compare-store";

/**
 * FlightCompareTray — the docked bar that appears once an offer is in the tray.
 *
 * This shell mounts on every public page, so it is kept to one store read. The
 * contents (and with them the offer generator and the comparison dialog) load
 * only once the tray actually has something in it, which keeps the bundle for a
 * content page free of a flight generator it will never run.
 */
const FlightCompareTrayBody = dynamic(
  () => import("./flight-compare-tray-body").then((m) => m.FlightCompareTrayBody),
  { ssr: false },
);

export function FlightCompareTray() {
  const ids = useFlightCompareIds();
  if (ids.length === 0) return null;
  return <FlightCompareTrayBody ids={ids} />;
}
