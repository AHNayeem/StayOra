/**
 * Fare model — how a route, cabin, carrier and passenger mix become money.
 *
 * Centralised here (rather than inline in the itinerary generator) so the
 * pricing story is auditable in one place and the same maths backs search
 * results, the details page, seat/ancillary repricing and the admin fare tables.
 * All amounts are **base USD**, consistent with listing prices, so the locale
 * currency switcher reprices flights exactly like everything else.
 *
 * A real integration deletes the generators and keeps the shapes: a live fare
 * quote already arrives itemised into base / taxes / carrier charges, which is
 * precisely {@link FareBreakdown}.
 */

import type {
  BaggageAllowance,
  CabinClass,
  FareBrand,
  FareBreakdown,
  FareLine,
  PassengerCounts,
} from "@/types/flight";
import { SeededRandom } from "@/lib/random";
import { AIRLINES_BY_CODE } from "./airlines";

/** Otithee's booking fee, per passenger, USD. */
export const FLIGHT_SERVICE_FEE_PER_PAX_USD = 9;

/** Taxes + carrier-imposed charges as a share of the base fare. */
const TAX_RATE = 0.17;

/** Fixed per-passenger airport/security charges, USD. */
const FIXED_CHARGES_USD = 22;

/** Base USD per km at the cheapest cabin, before any multiplier. */
const ECONOMY_RATE_PER_KM = 0.062;

/**
 * Long routes cost less per km than short ones — the fixed cost of a takeoff is
 * amortised over more distance. This taper keeps a 500 km hop from looking
 * absurdly cheap next to a 12,000 km haul.
 */
function taperedRatePerKm(km: number): number {
  if (km <= 800) return ECONOMY_RATE_PER_KM * 1.9;
  if (km <= 2500) return ECONOMY_RATE_PER_KM * 1.35;
  if (km <= 6000) return ECONOMY_RATE_PER_KM;
  return ECONOMY_RATE_PER_KM * 0.82;
}

/** Cabin price multipliers relative to economy. */
export const CABIN_MULTIPLIER: Record<CabinClass, number> = {
  economy: 1,
  "premium-economy": 1.65,
  business: 3.1,
  first: 5.4,
};

/** Human labels for the cabin classes. */
export const CABIN_LABEL: Record<CabinClass, string> = {
  economy: "Economy",
  "premium-economy": "Premium Economy",
  business: "Business",
  first: "First Class",
};

/** Short labels for dense surfaces (result cards, chips). */
export const CABIN_SHORT_LABEL: Record<CabinClass, string> = {
  economy: "Economy",
  "premium-economy": "Prem. Economy",
  business: "Business",
  first: "First",
};

/** Fare-family multipliers — flexibility costs money. */
const BRAND_MULTIPLIER: Record<FareBrand, number> = {
  Saver: 1,
  Value: 1.14,
  Flex: 1.32,
  "Business Flex": 1.12,
};

/** What each fare family actually grants the traveller. */
export const FARE_BRAND_RULES: Record<
  FareBrand,
  { refundable: boolean; changeable: boolean; seatSelection: string; note: string }
> = {
  Saver: {
    refundable: false,
    changeable: false,
    seatSelection: "Paid seat selection",
    note: "Lowest fare. No changes or refunds once ticketed.",
  },
  Value: {
    refundable: false,
    changeable: true,
    seatSelection: "Standard seats free at check-in",
    note: "Date changes allowed for a fee. Non-refundable.",
  },
  Flex: {
    refundable: true,
    changeable: true,
    seatSelection: "Free seat selection",
    note: "Change or refund up to 24 hours before departure, minus a small fee.",
  },
  "Business Flex": {
    refundable: true,
    changeable: true,
    seatSelection: "Free seat selection + priority boarding",
    note: "Fully flexible. Change any time; refund up to departure.",
  },
};

/** Baggage granted by cabin. Low-cost carriers strip the economy allowance. */
export function baggageFor(cabin: CabinClass, lowCost: boolean): BaggageAllowance {
  switch (cabin) {
    case "first":
      return { cabinKg: 14, checkedKg: 50, checkedPieces: 2 };
    case "business":
      return { cabinKg: 12, checkedKg: 40, checkedPieces: 2 };
    case "premium-economy":
      return { cabinKg: 10, checkedKg: 30, checkedPieces: 1 };
    default:
      return lowCost
        ? { cabinKg: 7, checkedKg: 0, checkedPieces: 0 }
        : { cabinKg: 7, checkedKg: 23, checkedPieces: 1 };
  }
}

/** Fare families offered in a cabin, cheapest first. */
export function brandsFor(cabin: CabinClass): FareBrand[] {
  return cabin === "business" || cabin === "first"
    ? ["Business Flex"]
    : ["Saver", "Value", "Flex"];
}

/** Adult base fare for one slice, before brand and carrier adjustments. */
export function baseFareForDistance(km: number, cabin: CabinClass): number {
  return km * taperedRatePerKm(km) * CABIN_MULTIPLIER[cabin];
}

/**
 * Passenger-type pricing. Children pay 75% of the adult base and full taxes;
 * infants travel on a lap for 10% of the base with only nominal charges — the
 * industry-standard split, and the reason a family total isn't just adults × N.
 */
const TYPE_BASE_SHARE = { adult: 1, child: 0.75, infant: 0.1 } as const;
const TYPE_TAX_SHARE = { adult: 1, child: 1, infant: 0.15 } as const;

/** Total seated + lap passengers on a booking. */
export function totalPassengers(counts: PassengerCounts): number {
  return counts.adults + counts.children + counts.infants;
}

/** Passengers who occupy a seat (infants don't). */
export function seatedPassengers(counts: PassengerCounts): number {
  return counts.adults + counts.children;
}

/**
 * Build the full itemised fare for an offer.
 *
 * `adultBaseUsd` is the all-slices adult base fare; every other figure is
 * derived from it so the breakdown always reconciles to the total shown on the
 * card — a reconciliation bug here would be visible on every screen.
 */
export function buildFare(options: {
  adultBaseUsd: number;
  passengers: PassengerCounts;
  brand: FareBrand;
  /** Airline IATA code, for the carrier price tier. */
  airlineCode: string;
  /** Promotional reduction as a share of base, 0–1. */
  promoRate?: number;
  /** Deterministic jitter source so identical offers price identically. */
  rng?: SeededRandom;
}): FareBreakdown {
  const { adultBaseUsd, passengers, brand, airlineCode, promoRate = 0, rng } = options;

  const airline = AIRLINES_BY_CODE[airlineCode];
  // Low-cost carriers undercut; premium carriers (rating ≥ 4.5) charge more.
  const carrierFactor = airline
    ? (airline.lowCost ? 0.84 : 1) * (airline.rating >= 4.5 ? 1.09 : 1)
    : 1;
  // ±6% of noise so two carriers on one route never tie exactly.
  const noise = rng ? 0.94 + rng.next() * 0.12 : 1;

  const adultBase = Math.max(
    35,
    Math.round(adultBaseUsd * BRAND_MULTIPLIER[brand] * carrierFactor * noise),
  );
  const adultTaxes = Math.round(adultBase * TAX_RATE + FIXED_CHARGES_USD);

  const counts = {
    adult: passengers.adults,
    child: passengers.children,
    infant: passengers.infants,
  } as const;

  const lines: FareLine[] = (["adult", "child", "infant"] as const)
    .filter((type) => counts[type] > 0)
    .map((type) => ({
      type,
      count: counts[type],
      baseUsd: Math.round(adultBase * TYPE_BASE_SHARE[type]),
      taxesUsd: Math.round(adultTaxes * TYPE_TAX_SHARE[type]),
    }));

  const baseFareUsd = lines.reduce((sum, l) => sum + l.baseUsd * l.count, 0);
  const taxesUsd = lines.reduce((sum, l) => sum + l.taxesUsd * l.count, 0);
  const paxCount = Math.max(1, totalPassengers(passengers));
  const serviceFeeUsd = FLIGHT_SERVICE_FEE_PER_PAX_USD * paxCount;
  const discountUsd = Math.round(baseFareUsd * promoRate);
  const totalUsd = Math.max(
    0,
    baseFareUsd + taxesUsd + serviceFeeUsd - discountUsd,
  );

  return {
    lines,
    baseFareUsd,
    taxesUsd,
    serviceFeeUsd,
    discountUsd,
    totalUsd,
    perAdultUsd: Math.round(totalUsd / paxCount),
  };
}

/**
 * Re-total a fare after seats, extras and a coupon are added. Kept separate from
 * {@link buildFare} so the airline fare stays immutable through the booking flow
 * and every added line item is traceable on the review screen.
 */
export function grandTotal(options: {
  fare: FareBreakdown;
  seatsUsd: number;
  ancillariesUsd: number;
  couponDiscountUsd: number;
}): number {
  const { fare, seatsUsd, ancillariesUsd, couponDiscountUsd } = options;
  return Math.max(
    0,
    fare.totalUsd + seatsUsd + ancillariesUsd - couponDiscountUsd,
  );
}

/** Change fee for a fare family, USD (0 when changes are free). */
export function changeFeeFor(brand: FareBrand, adultBaseUsd: number): number {
  if (brand === "Business Flex") return 0;
  if (brand === "Flex") return Math.round(Math.min(60, adultBaseUsd * 0.06));
  if (brand === "Value") return Math.round(Math.min(120, adultBaseUsd * 0.14));
  return 0; // Saver can't be changed at all.
}

/** Cancellation fee for a refundable fare, USD. */
export function cancellationFeeFor(brand: FareBrand, adultBaseUsd: number): number {
  if (brand === "Business Flex") return 0;
  if (brand === "Flex") return Math.round(Math.min(90, adultBaseUsd * 0.1));
  return 0; // Non-refundable brands never reach this path.
}

/**
 * Per-passenger CO₂ for a distance, kg. Roughly 90 g/passenger-km in economy,
 * scaled by how much floor space the cabin occupies — the same basis the
 * airlines' own calculators use.
 */
export function co2ForDistance(km: number, cabin: CabinClass): number {
  const cabinFactor =
    cabin === "first" ? 4 : cabin === "business" ? 2.9 : cabin === "premium-economy" ? 1.6 : 1;
  return Math.round(km * 0.09 * cabinFactor);
}
