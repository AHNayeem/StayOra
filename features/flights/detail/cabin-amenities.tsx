"use client";

import {
  Armchair,
  Leaf,
  Luggage,
  Monitor,
  Plane,
  Power,
  Utensils,
  Wifi,
} from "lucide-react";
import type { FlightOffer } from "@/types/flight";
import { AIRCRAFT_BY_CODE, AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * CabinAmenities — what the cabin and aircraft actually offer.
 *
 * Amenities are derived from the *aircraft types on this itinerary*, not from
 * the airline in general — a carrier with Wi-Fi on its widebodies may have none
 * on the regional jet flying your connection, and claiming otherwise on the
 * booking page is a promise the flight can't keep. Where types differ across
 * segments, the panel reports the weakest, and says so.
 */
export function CabinAmenities({ offer }: { offer: FlightOffer }) {
  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const aircraftCodes = [
    ...new Set(
      offer.slices.flatMap((s) => s.segments.map((seg) => seg.aircraftCode)),
    ),
  ];
  const aircraft = aircraftCodes
    .map((code) => AIRCRAFT_BY_CODE[code])
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const everyHas = (predicate: (a: (typeof aircraft)[number]) => boolean) =>
    aircraft.length > 0 && aircraft.every(predicate);
  const someHas = (predicate: (a: (typeof aircraft)[number]) => boolean) =>
    aircraft.some(predicate);

  const minPitch = aircraft.length
    ? Math.min(...aircraft.map((a) => a.seatPitchInches))
    : 0;

  const amenities = [
    {
      icon: Wifi,
      label: "Wi-Fi",
      available: everyHas((a) => a.hasWifi),
      partial: !everyHas((a) => a.hasWifi) && someHas((a) => a.hasWifi),
      note: "Usually paid, purchased on board",
    },
    {
      icon: Monitor,
      label: "Seat-back entertainment",
      available: everyHas((a) => a.hasEntertainment),
      partial: !everyHas((a) => a.hasEntertainment) && someHas((a) => a.hasEntertainment),
      note: "Films, TV and music",
    },
    {
      icon: Power,
      label: "Power outlet",
      available: everyHas((a) => a.hasPower),
      partial: !everyHas((a) => a.hasPower) && someHas((a) => a.hasPower),
      note: "USB and/or AC at every seat",
    },
    {
      icon: Utensils,
      label: "Meal service",
      available: offer.mealsIncluded,
      partial: false,
      note: offer.mealsIncluded
        ? "Included in your fare"
        : "Buy on board, or pre-order during booking",
    },
    {
      icon: Armchair,
      label: `${minPitch}" seat pitch`,
      available: minPitch >= 31,
      partial: false,
      note: minPitch >= 33 ? "Generous legroom" : "Standard legroom for this cabin",
    },
    {
      icon: Luggage,
      label:
        offer.baggage.checkedKg > 0
          ? `${offer.baggage.checkedKg} kg checked baggage`
          : "Cabin baggage only",
      available: offer.baggage.checkedKg > 0,
      partial: false,
      note: `${offer.baggage.cabinKg} kg cabin allowance`,
    },
  ];

  return (
    <section
      aria-labelledby="cabin-heading"
      className="rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="cabin-heading" className="text-base font-semibold text-ink">
          Cabin & amenities
        </h2>
        <Badge variant="primary">{CABIN_LABEL[offer.cabin]}</Badge>
      </div>

      {/* Aircraft on this itinerary */}
      <div className="mb-4 rounded-field bg-surface-muted/60 p-3">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          <Plane className="size-3.5" aria-hidden="true" />
          Aircraft
        </p>
        <ul className="mt-1.5 space-y-0.5">
          {aircraft.map((a) => (
            <li key={a.code} className="text-sm text-ink">
              {a.name}{" "}
              <span className="text-muted">
                · {a.wideBody ? "Widebody" : "Narrowbody"} · {a.seatPitchInches}&quot; pitch
              </span>
            </li>
          ))}
        </ul>
        {airline && (
          <p className="mt-1.5 text-xs text-muted">
            Operated by {airline.name} · {airline.onTimePct}% on-time performance
          </p>
        )}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {amenities.map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className={cn(
                "flex items-start gap-2.5 rounded-field border p-3",
                item.available
                  ? "border-line"
                  : item.partial
                    ? "border-accent-200 bg-accent-50/40"
                    : "border-line bg-surface-muted/40",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  item.available ? "text-primary" : item.partial ? "text-accent-600" : "text-muted",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    item.available || item.partial ? "text-ink" : "text-muted",
                  )}
                >
                  {item.label}
                  {item.partial && (
                    <span className="ml-1 text-xs font-normal text-accent-600">
                      (some flights only)
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted">{item.note}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* Emissions */}
      <div className="mt-4 flex items-start gap-2.5 rounded-field border border-line p-3">
        <Leaf className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm text-body">
          <span className="font-medium text-ink">{offer.co2Kg} kg CO₂</span> per traveller
          on this itinerary —{" "}
          {offer.co2VsAveragePct === 0
            ? "about average for this route"
            : `${Math.abs(offer.co2VsAveragePct)}% ${offer.co2VsAveragePct < 0 ? "below" : "above"} the average for this route`}
          .
        </p>
      </div>
    </section>
  );
}
