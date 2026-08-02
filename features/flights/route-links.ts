/**
 * Deep links from merchandising into a real search.
 *
 * A deal or route card should land the traveller on live fares, not on another
 * page that asks them to retype what they just clicked. These helpers build the
 * search URL for each merchandised shape, all going through
 * {@link searchHref} so there is exactly one encoding of a query in the app.
 *
 * Dates are the subtle part. Curated content carries dates anchored to a fixed
 * constant, which will drift into the past as the calendar moves — so
 * {@link upcoming} pushes any stale date forward rather than sending someone to
 * a search for last month. Callers supply "today" so this stays pure.
 */

import type { FlightDeal, FlightSearchQuery, PopularRoute } from "@/types/flight";
import { addDays, daysBetween } from "@/lib/flight-time";
import { searchHref } from "./query-url";

/**
 * A date that is definitely in the future: the given date if it still is, else
 * the same weekday a sensible distance ahead. Keeping the weekday stable matters
 * because weekend fares differ from midweek ones.
 */
export function upcoming(date: string, todayIso: string, minLeadDays = 14): string {
  const lead = daysBetween(todayIso, date);
  if (lead >= minLeadDays) return date;
  // Shift forward in whole weeks so the weekday is preserved.
  const weeksNeeded = Math.ceil((minLeadDays - lead) / 7);
  return addDays(date, weeksNeeded * 7);
}

/** Search URL for a popular route — one adult, economy, two weeks out. */
export function routeSearchHref(route: PopularRoute, todayIso?: string): string {
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  const query: FlightSearchQuery = {
    tripType: "one-way",
    legs: [{ from: route.fromCode, to: route.toCode, date: addDays(today, 14) }],
    passengers: { adults: 1, children: 0, infants: 0 },
    cabin: "economy",
    directOnly: false,
    flexibleDates: false,
    nearbyAirports: false,
    refundableOnly: false,
    baggageIncluded: false,
    preferredAirlines: [],
  };
  return searchHref(query);
}

/**
 * Search URL for a deal, preserving its cabin, dates and trip type — and
 * pre-selecting the airline, since that's what makes it *that* deal.
 */
export function dealSearchHref(deal: FlightDeal, todayIso?: string): string {
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  const depart = upcoming(deal.departDate, today);
  // Preserve the trip length when shifting the outbound date forward.
  const nights = deal.returnDate ? daysBetween(deal.departDate, deal.returnDate) : 0;

  const query: FlightSearchQuery = {
    tripType: deal.returnDate ? "round-trip" : "one-way",
    legs: deal.returnDate
      ? [
          { from: deal.fromCode, to: deal.toCode, date: depart },
          { from: deal.toCode, to: deal.fromCode, date: addDays(depart, nights) },
        ]
      : [{ from: deal.fromCode, to: deal.toCode, date: depart }],
    passengers: { adults: 1, children: 0, infants: 0 },
    cabin: deal.cabin,
    directOnly: false,
    flexibleDates: false,
    nearbyAirports: false,
    refundableOnly: false,
    baggageIncluded: false,
    preferredAirlines: [deal.airlineCode],
  };
  return searchHref(query);
}

/** Search URL for a bare city pair, e.g. from the global search dialog. */
export function pairSearchHref(
  fromCode: string,
  toCode: string,
  date?: string,
  todayIso?: string,
): string {
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  return searchHref({
    tripType: "one-way",
    legs: [{ from: fromCode, to: toCode, date: date ?? addDays(today, 14) }],
    passengers: { adults: 1, children: 0, infants: 0 },
    cabin: "economy",
    directOnly: false,
    flexibleDates: false,
    nearbyAirports: false,
    refundableOnly: false,
    baggageIncluded: false,
    preferredAirlines: [],
  });
}
