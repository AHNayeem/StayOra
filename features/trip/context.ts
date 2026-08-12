"use client";

/**
 * Seeding the travel context.
 *
 * One helper per entry point into the trip: a flight offer knows origin,
 * destination, dates, travellers and cabin; a listing knows a destination and
 * (once the widget is filled in) dates and party size. Both funnel into
 * {@link updateTripContext} so the context is written in exactly one shape, no
 * matter which module the traveller started from.
 */

import type { Listing } from "@/types/catalog";
import type { FlightOffer } from "@/types/flight";
import type { TripContext, TripPlace } from "@/types/trip";
import { AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { dateOf } from "@/lib/flight-time";
import { updateTripContext } from "./trip-store";

/** Airport → place, so recommendations can match on city and country. */
export function placeForAirport(code: string): TripPlace | undefined {
  const airport = AIRPORTS_BY_CODE[code];
  if (!airport) return undefined;
  return {
    city: airport.city,
    country: airport.country,
    countryCode: airport.countryCode,
    airportCode: airport.code,
    label: `${airport.city}, ${airport.country}`,
  };
}

/** Listing location → place. */
export function placeForListing(listing: Listing): TripPlace {
  return {
    city: listing.location.city ?? listing.location.label,
    country: listing.location.country ?? "",
    countryCode: listing.location.countryCode,
    label: listing.location.label,
  };
}

/**
 * The travel context a flight offer implies — pure, so a page can show relevant
 * recommendations *before* the traveller commits to anything.
 *
 * For a round trip the destination is where the outbound lands (not where the
 * itinerary finally ends, which is home again).
 */
export function contextFromOffer(offer: FlightOffer): TripContext {
  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];
  const inbound = offer.tripType === "round-trip" ? offer.slices[1] : undefined;

  return {
    origin: placeForAirport(first.fromCode),
    destination: placeForAirport(
      offer.tripType === "round-trip" ? first.toCode : last.toCode,
    ),
    departureDate: dateOf(first.departLocal),
    returnDate: inbound ? dateOf(inbound.arriveLocal) : undefined,
    travelers: {
      adults: offer.passengers.adults,
      children: offer.passengers.children,
      infants: offer.passengers.infants,
    },
    tripType: offer.tripType,
    cabinClass: offer.cabin,
    currency: "USD",
    seededBy: "flights",
    updatedAt: "",
  };
}

/**
 * Seed the trip from a selected flight offer — the most important entry point.
 * Destination, dates, party and cabin all come from the itinerary, so the
 * traveller never re-enters them to see relevant hotels or transfers.
 */
export function seedContextFromOffer(offer: FlightOffer, nowIso: string): void {
  const { origin, destination, departureDate, returnDate, travelers, tripType, cabinClass } =
    contextFromOffer(offer);

  updateTripContext(
    {
      origin,
      destination,
      departureDate,
      returnDate,
      travelers,
      tripType,
      cabinClass,
      seededBy: "flights",
    },
    nowIso,
  );
}

/**
 * Seed (or refine) the trip from a listing the traveller is booking. Only fills
 * gaps the flight didn't already establish, apart from the destination, which a
 * stay legitimately re-anchors.
 */
export function seedContextFromListing(
  listing: Listing,
  options: {
    checkIn?: string;
    checkOut?: string;
    travelers?: number;
    current: TripContext;
    nowIso: string;
  },
): void {
  const { current, nowIso } = options;
  const travelers =
    options.travelers && options.travelers > 0
      ? { adults: options.travelers, children: 0, infants: 0 }
      : undefined;

  updateTripContext(
    {
      destination: current.destination ?? placeForListing(listing),
      departureDate: current.departureDate ?? options.checkIn,
      returnDate: current.returnDate ?? options.checkOut,
      travelers: current.updatedAt ? undefined : travelers,
      seededBy: current.seededBy ?? listing.vertical,
    },
    nowIso,
  );
}

/** A short, human label for the trip, e.g. "Your Dubai trip". */
export function tripLabel(context: TripContext): string {
  const city = context.destination?.city;
  return city ? `Your ${city} trip` : "Your trip";
}

/** True once the context knows enough to make recommendations meaningful. */
export function hasDestination(context: TripContext): boolean {
  return Boolean(context.destination?.city);
}
