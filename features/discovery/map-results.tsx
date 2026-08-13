"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { CompareButton } from "./compare-button";
import { formatDistance, haversineKm, coordsFor, type GeoOrigin } from "./geo";
import { ListingMap } from "./listing-map";

interface MapResultsProps {
  listings: Listing[];
  origin: GeoOrigin | null;
  radiusKm: number | null;
}

/**
 * Map ↔ list, kept in one place because they are one thing.
 *
 * A single `selectedId` drives both: clicking a pin highlights and scrolls the
 * matching row, clicking a row highlights the pin. The list is the accessible
 * path through the same data — everything reachable by clicking a marker is
 * reachable by tabbing the list.
 */
export function MapResults({ listings, origin, radiusKm }: MapResultsProps) {
  const { money } = useLocale();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const selectFromMap = useCallback((id: string | null) => {
    setSelectedId(id);
    if (!id) return;
    // The global `prefers-reduced-motion` CSS can't reach a scripted scroll,
    // so the preference is honoured here explicitly.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rowRefs.current.get(id)?.scrollIntoView({
      block: "nearest",
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <ListingMap
        listings={listings}
        selectedId={selectedId}
        onSelect={selectFromMap}
        origin={origin}
        radiusKm={radiusKm}
        className="h-104 lg:sticky lg:top-24 lg:h-152"
      />

      <ul className="flex max-h-152 flex-col gap-3 overflow-y-auto pr-1">
        {listings.map((listing) => {
          const selected = listing.id === selectedId;
          const href = `${VERTICALS[listing.vertical].href}/${listing.slug}`;
          const distance = origin
            ? haversineKm(origin, coordsFor(listing))
            : null;

          return (
            <li
              key={listing.id}
              ref={(el) => {
                if (el) rowRefs.current.set(listing.id, el);
                else rowRefs.current.delete(listing.id);
              }}
              className={cn(
                "flex gap-3 rounded-card border bg-surface p-3 transition-colors",
                selected ? "border-primary ring-1 ring-primary" : "border-line",
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedId(selected ? null : listing.id)}
                aria-pressed={selected}
                aria-label={`${selected ? "Hide" : "Show"} ${listing.title} on the map`}
                className="relative size-20 shrink-0 overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Image
                  src={listing.image}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>

              <div className="min-w-0 flex-1">
                <Link
                  href={href}
                  className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary"
                >
                  {listing.title}
                </Link>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{listing.location.label}</span>
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {money(listing.price.amount)}
                    <span className="ml-1 text-xs font-normal text-muted">
                      {listing.price.unit}
                    </span>
                  </p>
                  {listing.rating !== undefined && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-body">
                      <Star className="size-3 fill-current text-warning" aria-hidden="true" />
                      {listing.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                {distance !== null && (
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDistance(distance)} from {origin?.label}
                  </p>
                )}
              </div>

              <CompareButton
                listingId={listing.id}
                label={listing.title}
                className="size-8 self-start border border-line"
              />
            </li>
          );
        })}

        {listings.length === 0 && (
          <li className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">
            Nothing matches these filters yet — widen the radius or clear a filter.
          </li>
        )}
      </ul>
    </div>
  );
}
