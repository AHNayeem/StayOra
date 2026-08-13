"use client";

import dynamic from "next/dynamic";
import { useCompareIds } from "./compare-store";

/**
 * CompareTray — the docked bar that appears once anything is in the tray.
 *
 * This shell mounts on every public page, so it is kept to one store read. The
 * contents (and with them the catalogue index and the comparison dialog) load
 * only once the tray actually has something in it, which keeps the bundle for a
 * content page free of a listing catalogue it will never render.
 */
const CompareTrayBody = dynamic(
  () => import("./compare-tray-body").then((m) => m.CompareTrayBody),
  { ssr: false },
);

export function CompareTray() {
  const ids = useCompareIds();
  if (ids.length === 0) return null;
  return <CompareTrayBody ids={ids} />;
}
