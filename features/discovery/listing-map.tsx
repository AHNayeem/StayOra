"use client";

import { useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { coordsFor, type GeoOrigin, type LatLng } from "./geo";

/**
 * A prototype map.
 *
 * No tiles, no map SDK, no API key — a Mercator projection of the result set
 * onto a plain panel, with one price pill per listing. That is enough to carry
 * the interaction the product actually needs: markers, a selected property,
 * and two-way synchronisation with the result list. Swapping in a real tile
 * provider later means replacing the projection and the marker layer; the
 * `selectedId` / `onSelect` contract above it does not change.
 */

interface Projected {
  listing: Listing;
  /** Position within the panel, as a percentage of width/height. */
  x: number;
  y: number;
}

/** Mercator y for a latitude, clamped away from the poles. */
function mercatorY(lat: number): number {
  const clamped = Math.max(-85, Math.min(85, lat));
  return Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360));
}

interface Bounds {
  minLng: number;
  maxLng: number;
  minY: number;
  maxY: number;
}

function computeBounds(points: LatLng[]): Bounds {
  if (points.length === 0) {
    return { minLng: -180, maxLng: 180, minY: mercatorY(-60), maxY: mercatorY(75) };
  }
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  // A floor on the span keeps a single result from being infinitely magnified,
  // and the padding keeps edge markers off the panel border.
  const lngSpan = Math.max(maxLng - minLng, 0.6);
  const latSpan = Math.max(maxLat - minLat, 0.4);
  const lngPad = lngSpan * 0.12;
  const latPad = latSpan * 0.12;
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;
  return {
    minLng: midLng - lngSpan / 2 - lngPad,
    maxLng: midLng + lngSpan / 2 + lngPad,
    minY: mercatorY(midLat - latSpan / 2 - latPad),
    maxY: mercatorY(midLat + latSpan / 2 + latPad),
  };
}

function project(point: LatLng, bounds: Bounds): { x: number; y: number } {
  const x = ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = ((bounds.maxY - mercatorY(point.lat)) / (bounds.maxY - bounds.minY)) * 100;
  return { x: Math.max(1.5, Math.min(98.5, x)), y: Math.max(2, Math.min(97, y)) };
}

interface ListingMapProps {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Near-me / "search this area" centre, drawn with its radius ring. */
  origin?: GeoOrigin | null;
  radiusKm?: number | null;
  className?: string;
}

export function ListingMap({
  listings,
  selectedId,
  onSelect,
  origin,
  radiusKm,
  className,
}: ListingMapProps) {
  const { money } = useLocale();

  const { markers, ring } = useMemo(() => {
    const points = listings.map((l) => ({ listing: l, point: coordsFor(l) }));
    const all = points.map((p) => p.point);
    if (origin) all.push(origin);
    const bounds = computeBounds(all);

    const markers: Projected[] = points.map(({ listing, point }) => ({
      listing,
      ...project(point, bounds),
    }));

    // The radius ring is drawn in longitude degrees at the origin's latitude,
    // then read as a percentage of panel width — an approximation, like the
    // filter it visualises.
    let ring: { x: number; y: number; widthPct: number } | null = null;
    if (origin && radiusKm) {
      const degLng = radiusKm / (111.32 * Math.cos((origin.lat * Math.PI) / 180) || 1);
      const widthPct = ((degLng * 2) / (bounds.maxLng - bounds.minLng)) * 100;
      ring = { ...project(origin, bounds), widthPct };
    }
    return { markers, ring };
  }, [listings, origin, radiusKm]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-panel border border-line bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))]",
        className,
      )}
    >
      {/* Graticule — decorative, so it stays out of the accessibility tree. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full text-line"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((x) => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={100} stroke="currentColor" strokeWidth={0.15} strokeDasharray="1 1.5" />
        ))}
        {[16.7, 33.3, 50, 66.7, 83.3].map((y) => (
          <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke="currentColor" strokeWidth={0.15} strokeDasharray="1 1.5" />
        ))}
      </svg>

      {ring && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full border-2 border-dashed border-primary/50 bg-primary/5"
          style={{
            left: `${ring.x}%`,
            top: `${ring.y}%`,
            width: `${ring.widthPct}%`,
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {origin && (
        <div
          className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-pill bg-ink px-2 py-1 text-xs font-medium text-white shadow-card"
          style={{ left: `${ring?.x ?? 50}%`, top: `${ring?.y ?? 50}%` }}
        >
          <Navigation className="size-3" aria-hidden="true" />
          {origin.label}
        </div>
      )}

      <ul
        aria-label={`${listings.length} ${listings.length === 1 ? "property" : "properties"} on the map`}
        className="absolute inset-0 m-0 list-none p-0"
      >
        {markers.map(({ listing, x, y }) => {
          const selected = listing.id === selectedId;
          return (
            <li
              key={listing.id}
              className="absolute"
              style={{ left: `${x}%`, top: `${y}%`, zIndex: selected ? 30 : 20 }}
            >
              <button
                type="button"
                onClick={() => onSelect(selected ? null : listing.id)}
                aria-pressed={selected}
                className={cn(
                  "-translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-pill border px-2 py-1 text-xs font-semibold shadow-card transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:hover:scale-105",
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-ink hover:border-primary hover:text-primary",
                )}
              >
                <span className="sr-only">{listing.title} — </span>
                {money(listing.price.amount)}
              </button>
            </li>
          );
        })}
      </ul>

      {listings.length === 0 && (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted">
          No properties match these filters.
        </p>
      )}

      <p className="absolute bottom-2 left-3 flex items-center gap-1 text-[11px] text-muted">
        <MapPin className="size-3" aria-hidden="true" />
        Prototype map · approximate positions
      </p>
    </div>
  );
}
