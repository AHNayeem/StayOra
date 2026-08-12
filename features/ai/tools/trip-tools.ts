/**
 * Trip tools — planning, budgeting and booking drafts.
 *
 * These are *composition* tools: they call the search tools above and assemble
 * the results into an itinerary, a costed budget, or a pre-filled checkout. No
 * new prices are ever created here — every figure is either a listing price, a
 * fare total, or the product of the two with the same fee rate checkout applies
 * ({@link SERVICE_FEE_RATE}), so a plan's total and the price at checkout agree.
 */

import type { ListingVertical } from "@/types/booking";
import type {
  AIBookingDraft,
  AIBudget,
  AIBudgetAlternative,
  AIBudgetLine,
  AIListingRef,
  AITravelers,
  AITripDay,
  AITripDayItem,
  AITripPlan,
  AITripStyle,
} from "@/types/ai";
import type { CabinClass, FlightOffer } from "@/types/flight";
import { BOOKING_CONFIG, FAQ_COMMON, SERVICE_FEE_RATE } from "@/constants/detail";
import { listingHref } from "@/constants/verticals";
import { computeBookingPricing, defaultQuantities, durationBetween, guestsFromSelection } from "@/lib/booking-pricing";
import { addDays, formatTime } from "@/lib/flight-time";
import { airportLabel } from "@/lib/mock/airports";
import { getListingBySlug } from "@/services/catalog";
import { usd } from "../lib/money";
import { stableId } from "../lib/text";
import type { AIPlace } from "../lib/places";
import { searchActivities, searchHotels, searchTransport } from "./catalog-tools";
import { searchFlights } from "./flight-tools";

/**
 * How a stated budget is provisionally split before real prices come back.
 *
 * This is a *search ceiling*, not a quoted number: it only decides which real
 * listings are considered. The plan's total is always the sum of the actual
 * prices found, and {@link calculateTripBudget} re-checks it against the budget.
 */
const BUDGET_SPLIT = { flight: 0.4, stay: 0.35, activities: 0.15, transport: 0.1 };

/** Activities to propose, by trip length — enough to fill days without padding. */
function activityCount(nights: number): number {
  if (nights <= 2) return 2;
  if (nights <= 5) return 3;
  return 4;
}

export interface TripPlanInput {
  place: AIPlace;
  nights: number;
  travelers: AITravelers;
  budgetUsd?: number;
  /** ISO `YYYY-MM-DD` departure; defaults inside the flight tool when absent. */
  startDate?: string;
  originCode?: string;
  cabin?: CabinClass;
  styles?: AITripStyle[];
  /** Number of activities to include; defaults by trip length. */
  activities?: number;
  today: string;
}

export interface TripPlanResult {
  plan: AITripPlan;
  /** Constraints that had to be relaxed across the underlying searches. */
  relaxed: string[];
  /** True when a flight could not be searched (no origin/destination airport). */
  flightUnavailable: boolean;
}

/**
 * createTripPlan — assemble a day-by-day trip from real Otithee inventory.
 *
 * Runs the component searches in parallel, then lays them out across the days:
 * arrival day gets the flight, transfer and check-in; each middle day gets one
 * activity; the last day closes with check-out and the return flight.
 */
export async function createTripPlan(input: TripPlanInput): Promise<TripPlanResult> {
  const nights = Math.max(1, input.nights);
  const partySize = Math.max(1, input.travelers.adults + input.travelers.children);
  const wantActivities = input.activities ?? activityCount(nights);

  const budget = input.budgetUsd;
  const flightCeiling = budget ? Math.round(budget * BUDGET_SPLIT.flight) : undefined;
  const nightlyCeiling = budget
    ? Math.max(20, Math.round((budget * BUDGET_SPLIT.stay) / nights))
    : undefined;
  const activityCeiling = budget
    ? Math.max(15, Math.round((budget * BUDGET_SPLIT.activities) / (wantActivities * partySize)))
    : undefined;

  const canSearchFlights = Boolean(input.originCode && input.place.airportCode);
  const startDate = input.startDate;
  const endDate = startDate ? addDays(startDate, nights) : undefined;

  const [flightResult, stayResult, transportResult, activityResult] = await Promise.all([
    canSearchFlights
      ? searchFlights({
          originCode: input.originCode,
          destinationCode: input.place.airportCode,
          startDate,
          endDate,
          tripType: "round-trip",
          cabin: input.cabin,
          travelers: input.travelers,
          rank: budget ? "cheapest" : "recommended",
          maxTotalUsd: flightCeiling,
          limit: 1,
          today: input.today,
        })
      : Promise.resolve(null),
    searchHotels({
      place: input.place,
      maxNightlyUsd: nightlyCeiling,
      styles: input.styles,
      nights,
      limit: 1,
    }),
    searchTransport({ place: input.place, limit: 1 }),
    searchActivities({
      place: input.place,
      maxUsd: activityCeiling,
      styles: input.styles,
      limit: wantActivities,
    }),
  ]);

  /** True when a search had to give up on the destination entirely. */
  const missedPlace = (relaxed: string[]) =>
    relaxed.some((entry) => entry.startsWith("destination "));

  const flight = flightResult?.items[0];
  const hotel = stayResult.items[0];
  // A transfer or excursion in a different city isn't part of this trip. If the
  // catalog has nothing at the destination, the plan is honestly shorter rather
  // than padded with something the traveller can't actually use.
  const transport = missedPlace(transportResult.relaxed) ? undefined : transportResult.items[0];
  const activities = missedPlace(activityResult.relaxed) ? [] : activityResult.items;

  const relaxed = [
    ...(flightResult?.relaxed ?? []),
    ...stayResult.relaxed,
    ...(missedPlace(transportResult.relaxed) ? [`airport transfers in ${input.place.label}`] : []),
    ...(missedPlace(activityResult.relaxed) ? [`activities in ${input.place.label}`] : []),
    // A country-wide fallback is disclosed, not hidden: the traveller should
    // know an "activity in Dubai" is actually elsewhere in the UAE.
    ...(stayResult.widenedTo ? [`a stay in ${input.place.label} itself`] : []),
    ...(activityResult.widenedTo ? [`activities in ${input.place.label} itself`] : []),
    ...(transportResult.widenedTo ? [`transfers in ${input.place.label} itself`] : []),
  ];

  const planId = stableId(
    "plan",
    `${input.place.label}:${nights}:${partySize}:${startDate ?? "flex"}`,
  );

  const days = buildDays({
    planId,
    place: input.place,
    nights,
    startDate,
    flight,
    hotel,
    transport,
    activities,
    originCode: input.originCode,
  });

  const totalUsd =
    (flight?.offer.fare.totalUsd ?? 0) +
    (hotel ? hotel.listing.price.amount * nights : 0) +
    (transport ? transport.listing.price.amount * 2 : 0) +
    activities.reduce((sum, a) => sum + a.listing.price.amount * partySize, 0);

  return {
    plan: {
      id: planId,
      destination: input.place.label,
      destinationCode: input.place.airportCode,
      originCode: input.originCode,
      nights,
      travelers: input.travelers,
      startDate,
      endDate,
      days,
      flight,
      hotel,
      transport,
      activities,
      totalUsd,
    },
    relaxed: [...new Set(relaxed)],
    flightUnavailable: !canSearchFlights,
  };
}

interface BuildDaysInput {
  planId: string;
  place: AIPlace;
  nights: number;
  startDate?: string;
  flight?: { offer: FlightOffer; href: string };
  hotel?: AIListingRef;
  transport?: AIListingRef;
  activities: AIListingRef[];
  originCode?: string;
}

/** Lay the chosen components out across the trip's days. */
function buildDays(input: BuildDaysInput): AITripDay[] {
  const { planId, place, nights, startDate, flight, hotel, transport, activities } = input;
  const dayCount = nights + 1;
  const days: AITripDay[] = [];

  for (let index = 0; index < dayCount; index += 1) {
    const dayNumber = index + 1;
    const date = startDate ? addDays(startDate, index) : undefined;
    const items: AITripDayItem[] = [];
    const key = (suffix: string) => stableId(`${planId}-d${dayNumber}`, suffix);

    if (index === 0) {
      if (flight) {
        const outbound = flight.offer.slices[0];
        items.push({
          id: key("flight-out"),
          time: formatTime(outbound.departLocal),
          kind: "flight",
          title: `Fly ${airportLabel(outbound.fromCode)} → ${airportLabel(outbound.toCode)}`,
          detail: `${flight.offer.airlineCode} · arrives ${formatTime(outbound.arriveLocal)}`,
          href: flight.href,
          priceUsd: flight.offer.fare.totalUsd,
        });
      }
      if (transport) {
        items.push({
          id: key("transfer-in"),
          kind: "transport",
          title: transport.listing.title,
          detail:
            transport.listing.vertical === "transport" && transport.listing.route
              ? `${transport.listing.route.from} → ${transport.listing.route.to}`
              : transport.reason,
          href: transport.href,
          priceUsd: transport.listing.price.amount,
          listingId: transport.listing.id,
        });
      }
      if (hotel) {
        items.push({
          id: key("checkin"),
          kind: "stay",
          title: `Check in — ${hotel.listing.title}`,
          detail: `${hotel.listing.location.label} · ${usd(hotel.listing.price.amount)} a night`,
          href: hotel.href,
          priceUsd: hotel.listing.price.amount * nights,
          listingId: hotel.listing.id,
        });
      }
      items.push({
        id: key("evening"),
        kind: "meal",
        title: "Dinner nearby",
        detail: `Explore ${place.label} at your own pace`,
      });
    } else if (index === dayCount - 1) {
      if (hotel) {
        items.push({
          id: key("checkout"),
          kind: "stay",
          title: `Check out — ${hotel.listing.title}`,
          href: hotel.href,
        });
      }
      if (transport) {
        items.push({
          id: key("transfer-out"),
          kind: "transport",
          title: "Return transfer to the airport",
          detail: transport.listing.title,
          href: transport.href,
          priceUsd: transport.listing.price.amount,
          listingId: transport.listing.id,
        });
      }
      if (flight && flight.offer.slices.length > 1) {
        const inbound = flight.offer.slices[flight.offer.slices.length - 1];
        items.push({
          id: key("flight-back"),
          time: formatTime(inbound.departLocal),
          kind: "flight",
          title: `Fly ${airportLabel(inbound.fromCode)} → ${airportLabel(inbound.toCode)}`,
          detail: `${flight.offer.airlineCode} · arrives ${formatTime(inbound.arriveLocal)}`,
          href: flight.href,
        });
      }
      if (items.length === 0) {
        items.push({ id: key("free"), kind: "free", title: "Departure day" });
      }
    } else {
      const activity = activities[(index - 1) % Math.max(1, activities.length)];
      if (activity && index - 1 < activities.length) {
        items.push({
          id: key(`activity-${activity.listing.id}`),
          kind: activity.listing.vertical === "tours" ? "tour" : "activity",
          title: activity.listing.title,
          detail: activity.reason,
          href: activity.href,
          priceUsd: activity.listing.price.amount,
          listingId: activity.listing.id,
        });
      } else {
        items.push({
          id: key("free"),
          kind: "free",
          title: `Free day in ${place.label}`,
          detail: "Add an activity from the assistant to fill it",
        });
      }
      items.push({ id: key("meal"), kind: "meal", title: "Lunch & local exploring" });
    }

    days.push({
      day: dayNumber,
      date,
      title:
        index === 0
          ? "Arrival"
          : index === dayCount - 1
            ? "Departure"
            : `Day ${dayNumber} in ${place.label}`,
      items,
    });
  }

  return days;
}

/* -------------------------------------------------------------------------- */
/* Budget                                                                      */
/* -------------------------------------------------------------------------- */

export interface BudgetInput {
  plan: AITripPlan;
  budgetUsd?: number;
}

/**
 * calculateTripBudget — cost a plan line by line and test it against the budget.
 *
 * Flight totals already include taxes and the flight service fee (see
 * {@link "@/lib/mock/fares".buildFare}), so only the catalog components attract
 * the platform's {@link SERVICE_FEE_RATE}. When the plan overruns, alternatives
 * are *found*, not estimated: each one is a real cheaper listing in the same
 * destination, and `savesUsd` is the arithmetic difference.
 */
export async function calculateTripBudget(input: BudgetInput): Promise<AIBudget> {
  const { plan } = input;
  const partySize = Math.max(1, plan.travelers.adults + plan.travelers.children);
  const lines: AIBudgetLine[] = [];

  if (plan.flight) {
    lines.push({
      kind: "flight",
      label: "Flights",
      detail: `${plan.flight.offer.airlineCode} · ${partySize} traveller${partySize > 1 ? "s" : ""} · taxes included`,
      amountUsd: plan.flight.offer.fare.totalUsd,
      href: plan.flight.href,
    });
  }
  if (plan.hotel) {
    lines.push({
      kind: "stay",
      label: "Stay",
      detail: `${plan.hotel.listing.title} · ${plan.nights} night${plan.nights > 1 ? "s" : ""} × ${usd(plan.hotel.listing.price.amount)}`,
      amountUsd: plan.hotel.listing.price.amount * plan.nights,
      href: plan.hotel.href,
    });
  }
  if (plan.transport) {
    lines.push({
      kind: "transport",
      label: "Airport transfers",
      detail: `${plan.transport.listing.title} · both ways`,
      amountUsd: plan.transport.listing.price.amount * 2,
      href: plan.transport.href,
    });
  }
  for (const activity of plan.activities) {
    lines.push({
      kind: "activity",
      label: activity.listing.title,
      detail: `${usd(activity.listing.price.amount)} × ${partySize}`,
      amountUsd: activity.listing.price.amount * partySize,
      href: activity.href,
    });
  }

  const subtotalUsd = lines.reduce((sum, l) => sum + l.amountUsd, 0);
  // Only catalog components carry the platform service fee; fares already do.
  const feeBase = lines
    .filter((l) => l.kind !== "flight")
    .reduce((sum, l) => sum + l.amountUsd, 0);
  const taxesUsd = Math.round(feeBase * SERVICE_FEE_RATE);
  const totalUsd = subtotalUsd + taxesUsd;

  if (taxesUsd > 0) {
    lines.push({
      kind: "fees",
      label: "Taxes & service fee",
      detail: `${Math.round(SERVICE_FEE_RATE * 100)}% on stays, transfers and activities`,
      amountUsd: taxesUsd,
    });
  }

  const budgetUsd = input.budgetUsd;
  const overByUsd = budgetUsd !== undefined ? Math.max(0, totalUsd - budgetUsd) : undefined;
  const remainingUsd = budgetUsd !== undefined ? Math.max(0, budgetUsd - totalUsd) : undefined;

  const alternatives = overByUsd && overByUsd > 0 ? await findAlternatives(plan) : [];

  return {
    budgetUsd,
    lines,
    subtotalUsd,
    taxesUsd,
    totalUsd,
    remainingUsd,
    overByUsd,
    alternatives,
  };
}

/**
 * Real, cheaper swaps for an over-budget plan, ordered by how much they save.
 * Each candidate is fetched from the catalog in the same destination, so the
 * saving quoted is exact and the traveller can click straight through to it.
 */
async function findAlternatives(plan: AITripPlan): Promise<AIBudgetAlternative[]> {
  const alternatives: AIBudgetAlternative[] = [];
  const place: AIPlace = {
    label: plan.destination,
    city: plan.hotel?.listing.location.city,
    country: plan.hotel?.listing.location.country,
    airportCode: plan.destinationCode,
    scope: "city",
  };

  if (plan.hotel) {
    const current = plan.hotel.listing;
    const cheaper = await searchHotels({
      place,
      maxNightlyUsd: Math.max(10, current.price.amount - 1),
      nights: plan.nights,
      limit: 3,
    });
    const candidate = cheaper.items.find((c) => c.listing.id !== current.id);
    if (candidate && candidate.listing.price.amount < current.price.amount) {
      alternatives.push({
        kind: "stay",
        label: `Switch to ${candidate.listing.title}`,
        detail: `${usd(candidate.listing.price.amount)} a night vs ${usd(current.price.amount)} · ${candidate.listing.rating?.toFixed(1) ?? "—"}★`,
        savesUsd: (current.price.amount - candidate.listing.price.amount) * plan.nights,
        href: candidate.href,
      });
    }
  }

  if (plan.activities.length > 0) {
    const priciest = [...plan.activities].sort(
      (a, b) => b.listing.price.amount - a.listing.price.amount,
    )[0];
    const cheaper = await searchActivities({
      place,
      maxUsd: Math.max(5, priciest.listing.price.amount - 1),
      limit: 3,
    });
    const candidate = cheaper.items.find(
      (c) => !plan.activities.some((a) => a.listing.id === c.listing.id),
    );
    if (candidate && candidate.listing.price.amount < priciest.listing.price.amount) {
      const partySize = Math.max(1, plan.travelers.adults + plan.travelers.children);
      alternatives.push({
        kind: "activity",
        label: `Swap “${priciest.listing.title}” for “${candidate.listing.title}”`,
        detail: `${usd(candidate.listing.price.amount)} vs ${usd(priciest.listing.price.amount)} per person`,
        savesUsd:
          (priciest.listing.price.amount - candidate.listing.price.amount) * partySize,
        href: candidate.href,
      });
    }
  }

  return alternatives.sort((a, b) => b.savesUsd - a.savesUsd);
}

/* -------------------------------------------------------------------------- */
/* Booking draft                                                               */
/* -------------------------------------------------------------------------- */

export interface BookingDraftInput {
  vertical: ListingVertical;
  slug: string;
  /** ISO check-in; defaults to three weeks out for range-mode verticals. */
  checkIn?: string;
  checkOut?: string;
  /** ISO date for single-date verticals. */
  date?: string;
  guests?: number;
  rooms?: number;
  nights?: number;
  today: string;
}

/** How far out an unspecified booking is drafted. */
const DEFAULT_DRAFT_LEAD_DAYS = 21;

/**
 * createBookingDraft — a fully-priced, *unconfirmed* booking.
 *
 * Prices come from {@link computeBookingPricing}, the same function the booking
 * widget and checkout use, so the draft and the checkout page always agree. The
 * returned `checkoutHref` reproduces the widget's own query string — the
 * traveller lands in the normal flow and confirms there. The assistant never
 * takes payment.
 */
export async function createBookingDraft(
  input: BookingDraftInput,
): Promise<AIBookingDraft | undefined> {
  const listing = await getListingBySlug(input.vertical, input.slug);
  if (!listing) return undefined;

  const config = BOOKING_CONFIG[input.vertical];
  const quantities = defaultQuantities(config);
  if (input.rooms !== undefined && "rooms" in quantities) {
    quantities.rooms = clampField(config.fields, "rooms", input.rooms);
  }
  if (input.guests !== undefined) {
    for (const key of ["guests", "travellers", "travelers", "participants", "passengers", "attendees", "applicants"]) {
      if (key in quantities) {
        quantities[key] = clampField(config.fields, key, input.guests);
        break;
      }
    }
  }

  const nights = Math.max(1, input.nights ?? 2);
  let checkIn = "";
  let checkOut = "";
  let singleDate = "";

  if (config.dateMode === "range") {
    checkIn = input.checkIn ?? addDays(input.today, DEFAULT_DRAFT_LEAD_DAYS);
    checkOut = input.checkOut ?? addDays(checkIn, nights);
  } else if (config.dateMode === "single") {
    singleDate = input.date ?? input.checkIn ?? addDays(input.today, DEFAULT_DRAFT_LEAD_DAYS);
  }

  const selection = { checkIn, checkOut, singleDate, quantities };
  const pricing = computeBookingPricing(listing, config, selection);

  const params = new URLSearchParams({ v: listing.vertical, slug: listing.slug });
  if (config.dateMode === "range") {
    if (checkIn) params.set("in", checkIn);
    if (checkOut) params.set("out", checkOut);
  } else if (config.dateMode === "single" && singleDate) {
    params.set("on", singleDate);
  }
  for (const field of config.fields) {
    params.set(`q_${field.key}`, String(quantities[field.key] ?? field.default));
  }

  const freeCancellation = (listing.badges ?? []).some((b) => /cancel/i.test(b));
  const policyFaq = FAQ_COMMON.find((f) => /cancellation/i.test(f.question));

  return {
    listing,
    href: listingHref(listing),
    checkIn,
    checkOut,
    singleDate,
    nights: config.dateMode === "range" ? durationBetween(checkIn, checkOut) : 0,
    guests: guestsFromSelection(config, quantities),
    quantities,
    subtotalUsd: pricing.subtotalUsd,
    serviceFeeUsd: pricing.serviceFeeUsd,
    totalUsd: pricing.totalUsd,
    cancellationPolicy: freeCancellation
      ? `Free cancellation — this listing is flagged “${(listing.badges ?? []).find((b) => /cancel/i.test(b))}”.`
      : (policyFaq?.answer ?? "Cancellation terms are confirmed before any payment is taken."),
    checkoutHref: `/checkout?${params.toString()}`,
  };
}

/** Clamp a requested quantity into the field's configured bounds. */
function clampField(
  fields: (typeof BOOKING_CONFIG)[ListingVertical]["fields"],
  key: string,
  value: number,
): number {
  const field = fields.find((f) => f.key === key);
  if (!field) return value;
  return Math.max(field.min, Math.min(field.max, Math.round(value)));
}
