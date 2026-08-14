"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, X } from "lucide-react";
import type { FlightOffer } from "@/types/flight";
import { offerFromId } from "@/lib/mock/flights";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { AirlineLogo } from "../airline-logo";
import {
  FLIGHT_COMPARE_LIMIT,
  clearFlightCompare,
  removeFromFlightCompare,
} from "../compare-store";
import { FlightCompareDialog } from "./flight-compare-dialog";
import { offerLabel } from "./offer-label";

/**
 * The tray's contents — split from {@link FlightCompareTray} because this is the
 * half that needs the offer generator. Loaded on demand, so a visitor reading
 * the privacy policy never downloads the flight generator to render a bar they
 * haven't opened.
 *
 * Offers are rebuilt from their ids rather than passed down from the results
 * page: the tray outlives the page that filled it, and a traveller who opens a
 * detail page (or reloads) still gets a working comparison.
 */
export function FlightCompareTrayBody({ ids }: { ids: string[] }) {
  const { money } = useLocale();
  const [open, setOpen] = useState(false);

  // Rebuilding an offer replays the generator, so this is memoised: the store
  // hands back the same array identity until the tray actually changes, and a
  // re-render for any other reason must not re-run the search four times.
  const offers = useMemo(
    () => ids.map(offerFromId).filter((o): o is FlightOffer => o !== undefined),
    [ids],
  );

  /**
   * Drop ids nothing can be rebuilt from. Without this an id minted by an older
   * encoding would sit in the tray forever, holding a slot with no chip to
   * remove it. An effect, not a render-phase write — it mutates a store other
   * components are subscribed to.
   */
  useEffect(() => {
    if (offers.length === ids.length) return;
    const alive = new Set(offers.map((o) => o.id));
    for (const id of ids) if (!alive.has(id)) removeFromFlightCompare(id);
  }, [ids, offers]);

  if (offers.length === 0) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Flight compare tray"
        className="border-t border-line bg-surface/95 shadow-menu backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:gap-4">
          <p aria-live="polite" className="text-sm font-medium text-ink">
            {offers.length} of {FLIGHT_COMPARE_LIMIT} flights
          </p>

          <ul className="flex flex-1 flex-wrap items-center gap-2">
            {offers.map((offer) => (
              <li key={offer.id} className="relative">
                <span className="flex items-center gap-2 rounded-field border border-line bg-surface py-1 pl-1.5 pr-8">
                  <AirlineLogo code={offer.airlineCode} size="sm" />
                  <span className="text-xs font-medium text-ink">
                    {offer.slices[0].fromCode}→
                    {offer.slices[offer.slices.length - 1].toCode}
                  </span>
                  <span className="text-xs font-semibold text-accent-600">
                    {money(offer.fare.totalUsd)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFromFlightCompare(offer.id)}
                  aria-label={`Remove ${offerLabel(offer)} from compare`}
                  className="absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearFlightCompare}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} disabled={offers.length < 2}>
              <Scale className="size-4" aria-hidden="true" />
              Compare {offers.length}
            </Button>
          </div>
        </div>
      </div>

      {/* Mounted only while open — a closed dialog has no reason to build four
          itinerary tables. */}
      {open && (
        <FlightCompareDialog open={open} onClose={() => setOpen(false)} offers={offers} />
      )}
    </>
  );
}
