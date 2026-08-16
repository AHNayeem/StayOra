/**
 * Flight tools — everything the assistant knows about fares comes from
 * {@link "@/services/flight.service"}.
 *
 * The tool builds a {@link FlightSearchQuery} exactly like the search panel
 * does, runs the same `searchFlights` call the results page runs, and reuses the
 * service's own pure `sortOffers` / `applyFilters`. That means an offer the
 * assistant quotes is the identical offer the traveller reaches by clicking
 * through, at the identical price.
 */

import type {
  CabinClass,
  FlightOffer,
  FlightSearchQuery,
  FlightSearchResult,
  TripType,
  VisaRequirement,
} from "@/types/flight";
import type { AIComparisonRow, AIComparisonSubject, AIFlightRef, AITravelers } from "@/types/ai";
import {
  AIRLINES_BY_CODE,
  normalizeQuery,
  sortOffers,
  totalDuration,
  totalStops,
} from "@/services/flight.service";
import { getRepositories } from "../repositories";
import { searchHref } from "@/features/flights/query-url";
import { addDays, formatDuration, formatTime } from "@/lib/flight-time";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { usd } from "../lib/money";
import type { AIComparison } from "./catalog-tools";

/** How far out to search when the traveller gave no date. */
const DEFAULT_LEAD_DAYS = 21;
/** Default stay length used to derive a return date when only "round trip" is known. */
const DEFAULT_RETURN_NIGHTS = 5;

export interface FlightSearchInput {
  originCode?: string;
  destinationCode?: string;
  /** ISO `YYYY-MM-DD`; defaults to three weeks out. */
  startDate?: string;
  /** ISO `YYYY-MM-DD` return date for round trips. */
  endDate?: string;
  cabin?: CabinClass;
  tripType?: TripType;
  travelers?: AITravelers;
  directOnly?: boolean;
  /** "cheapest" | "fastest" | "recommended" — how the traveller asked to rank. */
  rank?: "cheapest" | "fastest" | "recommended";
  /** Total budget ceiling in base USD, applied to the offer total. */
  maxTotalUsd?: number;
  limit?: number;
  /** Today's date, supplied by the caller so this stays clock-free. */
  today: string;
}

export interface AIFlightResult {
  items: AIFlightRef[];
  total: number;
  relaxed: string[];
  query: FlightSearchQuery;
  /** Full results-page link for "see all". */
  moreHref: string;
  /** Facets from the service, so the answer can quote a real price range. */
  facets: FlightSearchResult["facets"];
}

/** Detail-page link for an offer (ids are self-describing, so this is stable). */
export function offerHref(offer: FlightOffer): string {
  return `/flights/${encodeURIComponent(offer.id)}`;
}

/** Build the search query the flight module would build for the same ask. */
export function buildFlightQuery(input: FlightSearchInput): FlightSearchQuery {
  const depart = input.startDate ?? addDays(input.today, DEFAULT_LEAD_DAYS);
  const tripType: TripType =
    input.tripType ?? (input.endDate ? "round-trip" : "one-way");

  const legs = [
    { from: input.originCode ?? "", to: input.destinationCode ?? "", date: depart },
  ];
  if (tripType === "round-trip") {
    legs.push({
      from: input.destinationCode ?? "",
      to: input.originCode ?? "",
      date: input.endDate ?? addDays(depart, DEFAULT_RETURN_NIGHTS),
    });
  }

  return normalizeQuery({
    tripType,
    legs,
    passengers: {
      adults: input.travelers?.adults ?? 1,
      children: input.travelers?.children ?? 0,
      infants: 0,
    },
    cabin: input.cabin ?? "economy",
    directOnly: input.directOnly ?? false,
    flexibleDates: false,
    nearbyAirports: false,
    refundableOnly: false,
    baggageIncluded: false,
    preferredAirlines: [],
  });
}

/** Why this fare — every clause is a fact from the offer itself. */
function flightReason(offer: FlightOffer): string {
  const stops = totalStops(offer);
  const bits = [
    stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`,
    formatDuration(totalDuration(offer)),
    CABIN_LABEL[offer.cabin],
    offer.baggage.checkedKg > 0 ? `${offer.baggage.checkedKg}kg checked` : "Cabin bag only",
  ];
  if (offer.refundable) bits.push("Refundable");
  if (offer.badges.includes("cheapest")) bits.push("Cheapest on this route");
  else if (offer.badges.includes("fastest")) bits.push("Fastest on this route");
  return bits.join(" · ");
}

/**
 * searchFlights — ranked live fares for a route.
 *
 * An incomplete query (missing origin, destination or a valid date) returns an
 * empty result rather than a guess; the engine turns that into a question.
 */
export async function searchFlights(input: FlightSearchInput): Promise<AIFlightResult> {
  const query = buildFlightQuery(input);
  const result = await getRepositories().flights.search(query);
  const relaxed: string[] = [];

  let offers = result.offers;
  if (input.maxTotalUsd !== undefined) {
    const affordable = offers.filter((o) => o.fare.totalUsd <= input.maxTotalUsd!);
    if (affordable.length > 0) offers = affordable;
    else if (offers.length > 0) relaxed.push(`fares under ${usd(input.maxTotalUsd)}`);
  }

  const sorted = sortOffers(offers, input.rank === "fastest" ? "fastest" : input.rank === "cheapest" ? "cheapest" : "recommended");
  const limit = input.limit ?? 3;

  return {
    items: sorted.slice(0, limit).map((offer) => ({
      offer,
      href: offerHref(offer),
      reason: flightReason(offer),
    })),
    total: offers.length,
    relaxed,
    query,
    moreHref: searchHref(query),
    facets: result.facets,
  };
}

/** getFlightDetails — rebuild one offer from its id. */
export async function getFlightDetails(offerId: string): Promise<AIFlightRef | undefined> {
  const offer = await getRepositories().flights.getOffer(offerId);
  if (!offer) return undefined;
  return { offer, href: offerHref(offer), reason: flightReason(offer) };
}

/**
 * compareFlights — structured side-by-side on the axes travellers actually
 * trade off. The verdict is computed from the same numbers the table prints.
 */
export async function compareFlights(offerIds: string[]): Promise<AIComparison | undefined> {
  const flights = getRepositories().flights;
  const resolved = await Promise.all(offerIds.slice(0, 4).map((id) => flights.getOffer(id)));
  const offers = resolved.filter((o): o is FlightOffer => Boolean(o));
  if (offers.length < 2) return undefined;

  // Column headers have to *distinguish* the options — on one route every offer
  // shares the same city pair, so the airline and departure time lead instead.
  const subjects: AIComparisonSubject[] = offers.map((offer) => {
    const firstSlice = offer.slices[0];
    const lastSlice = offer.slices[offer.slices.length - 1];
    const airline = AIRLINES_BY_CODE[offer.airlineCode]?.name ?? offer.airlineCode;
    return {
      id: offer.id,
      title: `${airline} · ${formatTime(firstSlice.departLocal)}`,
      subtitle: `${firstSlice.fromCode} → ${lastSlice.toCode} · ${CABIN_LABEL[offer.cabin]} · ${offer.fareBrand}`,
      href: offerHref(offer),
    };
  });

  const totals = offers.map((o) => o.fare.totalUsd);
  const durations = offers.map(totalDuration);
  const stops = offers.map(totalStops);
  const baggage = offers.map((o) => o.baggage.checkedKg);
  const co2 = offers.map((o) => o.co2Kg);

  const rows: AIComparisonRow[] = [
    {
      label: "Total price",
      values: totals.map((v) => usd(v)),
      bestIndex: minIndex(totals),
    },
    {
      label: "Per adult",
      values: offers.map((o) => usd(o.fare.perAdultUsd)),
      bestIndex: minIndex(offers.map((o) => o.fare.perAdultUsd)),
    },
    {
      label: "Journey time",
      values: durations.map(formatDuration),
      bestIndex: minIndex(durations),
    },
    {
      label: "Stops",
      values: stops.map((s) => (s === 0 ? "Non-stop" : `${s} stop${s > 1 ? "s" : ""}`)),
      bestIndex: minIndex(stops),
    },
    {
      label: "Departs",
      values: offers.map((o) => formatTime(o.slices[0].departLocal)),
    },
    {
      label: "Arrives",
      values: offers.map((o) => formatTime(o.slices[o.slices.length - 1].arriveLocal)),
    },
    {
      label: "Checked baggage",
      values: baggage.map((kg) => (kg > 0 ? `${kg} kg` : "Not included")),
      bestIndex: maxIndex(baggage),
    },
    { label: "Refundable", values: offers.map((o) => (o.refundable ? "Yes" : "No")) },
    {
      label: "Changeable",
      values: offers.map((o) => (o.changeable ? `Yes · ${usd(o.changeFeeUsd)} fee` : "No")),
    },
    {
      label: "CO₂ per traveller",
      values: co2.map((kg) => `${Math.round(kg)} kg`),
      bestIndex: minIndex(co2),
    },
    { label: "Seats left", values: offers.map((o) => `${o.seatsAvailable}`) },
  ];

  const cheapest = offers[minIndex(totals)];
  const fastest = offers[minIndex(durations)];
  const parts: string[] = [];
  if (cheapest.id === fastest.id) {
    parts.push(
      `The ${cheapest.airlineCode} fare is both the cheapest (${usd(cheapest.fare.totalUsd)}) and the fastest (${formatDuration(totalDuration(cheapest))}) — an easy pick.`,
    );
  } else {
    const priceGap = cheapest.fare.totalUsd - fastest.fare.totalUsd;
    const timeGap = totalDuration(fastest) - totalDuration(cheapest);
    parts.push(
      `Cheapest is ${cheapest.airlineCode} at ${usd(cheapest.fare.totalUsd)}; fastest is ${fastest.airlineCode} at ${formatDuration(totalDuration(fastest))}.`,
      `Paying ${usd(Math.abs(priceGap))} more buys back ${formatDuration(Math.abs(timeGap))}.`,
    );
  }
  const nonStop = offers.find((o) => totalStops(o) === 0);
  if (nonStop && nonStop.id !== cheapest.id) {
    parts.push(`${nonStop.airlineCode} is the only non-stop option here.`);
  }

  return { subjects, rows, recommendation: parts.join(" ") };
}

/**
 * searchVisa — indicative entry requirements for a destination.
 *
 * Explicitly advisory: the service itself is careful not to assert an
 * entitlement, and the UI marks the answer as prototype data. A real build
 * swaps this for a licensed entry-requirements provider behind the same call.
 */
export function getVisaStatus(
  destinationCode: string,
  nationality: string,
): Promise<VisaRequirement> {
  return getRepositories().flights.getVisaRequirement(destinationCode, nationality);
}

function minIndex(values: number[]): number {
  return values.reduce((best, v, i) => (v < values[best] ? i : best), 0);
}
function maxIndex(values: number[]): number {
  return values.reduce((best, v, i) => (v > values[best] ? i : best), 0);
}
