/**
 * Unified-trip domain types — the contract for building one trip out of several
 * products, then booking them together.
 *
 * The model is deliberately thin and additive: a {@link TripContext} is the
 * travel intent (where, when, who), a {@link TripItem} is one product the
 * traveller has chosen, and a {@link TripBooking} is what checkout produced —
 * a *group* of independent bookings, never a single merged one. Every component
 * keeps its own merchant, its own lifecycle and its own money, because that's
 * what the platform's booking domain already models
 * ({@link "@/features/dashboard/domain"}); the trip only adds the grouping.
 *
 * All money is base USD, like the rest of the platform, so the locale currency
 * switcher can reprice a trip live.
 */

import type { BookingVertical, ListingVertical } from "./booking";
import type { CabinClass, TripType } from "./flight";
import type {
  BookingFailureReason,
  BookingSegment,
  BookingStatus,
} from "@/features/dashboard/domain/types";

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

/** Head-count for the whole trip. Infants are lap-held on flights. */
export interface TripTravelers {
  adults: number;
  children: number;
  infants: number;
}

/** A place the trip starts from or goes to. */
export interface TripPlace {
  /** City name, e.g. "Dubai" — the key every recommendation matches on. */
  city: string;
  country: string;
  /** ISO 3166-1 alpha-2, when known. */
  countryCode?: string;
  /** Arrival/departure airport IATA when the trip was seeded from a flight. */
  airportCode?: string;
  /** Display label, e.g. "Dubai, United Arab Emirates". */
  label: string;
}

/** Why the traveller is going — nudges which categories rank first. */
export type TripPurpose = "leisure" | "business" | "family" | "honeymoon";

/**
 * The travel context every recommendation and every trip item is derived from.
 *
 * One instance lives in the trip store and is shared across the journey, so
 * selecting a Dhaka → Dubai flight teaches the hotel, transfer and activity
 * rails where and when the traveller is going without any component re-deriving
 * it.
 */
export interface TripContext {
  origin?: TripPlace;
  destination?: TripPlace;
  /** ISO `YYYY-MM-DD`. */
  departureDate?: string;
  /** ISO `YYYY-MM-DD`; absent for one-way trips. */
  returnDate?: string;
  travelers: TripTravelers;
  tripType: TripType;
  cabinClass?: CabinClass;
  /** Total budget for the whole trip, base USD. Optional. */
  budgetUsd?: number;
  /** Base currency the amounts are stored in — always "USD" today. */
  currency: string;
  purpose?: TripPurpose;
  /** What seeded the context, for copy ("Complete your flight to Dubai"). */
  seededBy?: BookingVertical;
  updatedAt: string;
}

/** Total head-count (infants included). */
export function travelerCount(travelers: TripTravelers): number {
  return travelers.adults + travelers.children + travelers.infants;
}

/** Head-count that occupies a seat/bed (infants excluded). */
export function seatedTravelerCount(travelers: TripTravelers): number {
  return travelers.adults + travelers.children;
}

/* -------------------------------------------------------------------------- */
/* Cart                                                                        */
/* -------------------------------------------------------------------------- */

/** How a trip item can be resolved back to the product it came from. */
export type TripItemRef =
  | { source: "catalog"; vertical: ListingVertical; slug: string; listingId: string }
  | { source: "flight"; offerId: string }
  | { source: "combo"; comboId: string; comboItemId: string };

/** One product the traveller has added to the trip. */
export interface TripItem {
  id: string;
  /** Product kind — the same vocabulary the platform's bookings use. */
  kind: BookingVertical;
  ref: TripItemRef;
  title: string;
  image: string;
  /** City the product is delivered in. */
  destination: string;
  /** Provider that owns this component — preserved through to booking. */
  merchantId: string;
  merchantName: string;
  /** List price of one unit for one duration step, base USD. */
  unitPriceUsd: number;
  /** Rooms / vehicles / seats — the multiplier the traveller picked. */
  quantity: number;
  /** Nights or days the price is multiplied by (1 for one-off products). */
  units: number;
  /** Unit label for the summary line, e.g. "night", "day". */
  unitLabel?: string;
  /** ISO `YYYY-MM-DD`. */
  startDate: string;
  /** ISO `YYYY-MM-DD`. */
  endDate: string;
  travelers: number;
  /** `unitPriceUsd × units × quantity`, base USD. */
  subtotalUsd: number;
  /** Human summary, e.g. "4 nights · 1 room · 2 guests". */
  detail: string;
  /** Max people the product can take — checked before the booking is made. */
  capacity?: number;
  /** Link back to the product page, when it has one. */
  href?: string;
  addedAt: string;
}

/** The traveller's in-progress trip: intent plus the products chosen so far. */
export interface TripCart {
  context: TripContext;
  items: TripItem[];
  /** Bundle applied to the trip, when the traveller took one. */
  comboId?: string;
  comboName?: string;
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/** One priced line of a trip — mirrors what the component's booking will cost. */
export interface TripPriceLine {
  itemId: string;
  title: string;
  kind: BookingVertical;
  merchantName: string;
  /** List price for this component before any trip-level saving. */
  baseUsd: number;
  /** This component's share of the bundle/coupon saving. */
  discountUsd: number;
  netSaleUsd: number;
  taxesUsd: number;
  feesUsd: number;
  totalUsd: number;
  /** Platform commission for this component (never shown to B2C). */
  commissionUsd: number;
  commissionRate: number;
}

/** The full money picture for a trip — the only place trip totals are computed. */
export interface TripPricing {
  currency: string;
  lines: TripPriceLine[];
  /** Sum of every component's list price. */
  subtotalUsd: number;
  /** Multi-product bundle saving. */
  bundleDiscountUsd: number;
  /** Promo/coupon saving. */
  couponDiscountUsd: number;
  /** `bundleDiscountUsd + couponDiscountUsd`. */
  discountUsd: number;
  taxesUsd: number;
  feesUsd: number;
  totalUsd: number;
  /** What the traveller would pay booking each product on its own. */
  separatelyUsd: number;
  /** `separatelyUsd - totalUsd` — the headline "you save". */
  savingsUsd: number;
  /** Aggregate platform commission across components (B2B/admin surfaces). */
  commissionUsd: number;
  /** Percentage rate the bundle discount was struck at. */
  bundleRatePct: number;
}

/* -------------------------------------------------------------------------- */
/* Booked trip                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One booked component of a trip.
 *
 * `bookingId` points at the platform booking that owns the lifecycle — this
 * record caches the last-known status so a list renders without a store read,
 * but the domain booking is always authoritative.
 */
export interface TripComponent {
  bookingId: string;
  reference: string;
  kind: BookingVertical;
  title: string;
  detail: string;
  image: string;
  merchantId: string;
  merchantName: string;
  startDate: string;
  endDate: string;
  travelers: number;
  totalUsd: number;
  status: BookingStatus;
  failureReason?: BookingFailureReason;
  failureNote?: string;
  /** The `/account/bookings` record created alongside, when there is one. */
  travelerBookingId?: string;
  invoiceId?: string;
  /** Product page to rebook or replace from. */
  href?: string;
}

/**
 * Roll-up of a trip's component states. Never a component's own status: a trip
 * with a confirmed flight and a failed hotel is `partially_confirmed`, and the
 * traveller keeps the flight.
 */
export type TripStatus =
  | "confirmed"
  | "partially_confirmed"
  | "pending"
  | "failed"
  | "cancelled"
  | "refund_pending"
  | "completed";

/** A trip the traveller has booked — a group of independent bookings. */
export interface TripBooking {
  id: string;
  /** Human reference, e.g. "TRIP-10021". */
  reference: string;
  createdAt: string;
  destination: string;
  destinationLabel: string;
  /** Earliest component start (ISO date). */
  startDate: string;
  /** Latest component end (ISO date). */
  endDate: string;
  travelers: TripTravelers;
  segment: BookingSegment;
  organizationName?: string;
  comboId?: string;
  comboName?: string;
  currency: string;
  subtotalUsd: number;
  discountUsd: number;
  taxesUsd: number;
  feesUsd: number;
  totalUsd: number;
  savingsUsd: number;
  commissionUsd: number;
  paymentMethod: string;
  components: TripComponent[];
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                             */
/* -------------------------------------------------------------------------- */

/** How well a recommendation matches the trip — drives the "why" copy. */
export type RecommendationMatch = "destination" | "country" | "popular";

/** One recommended product, already shaped for a card. */
export interface RecommendedProduct {
  id: string;
  kind: ListingVertical;
  slug: string;
  title: string;
  image: string;
  location: string;
  priceUsd: number;
  priceUnit: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  href: string;
  /** Why this was suggested, in the traveller's words. */
  reason: string;
  match: RecommendationMatch;
  /** Max people the product takes, when the vertical models it. */
  capacity?: number;
  /** Nights/days the product runs for, when it has a duration. */
  durationDays?: number;
}

/** A category of recommendations for the current trip. */
export interface RecommendationGroup {
  key: ListingVertical;
  /** e.g. "Hotels in Dubai". */
  title: string;
  /** e.g. "From $65 per night". */
  subtitle: string;
  /** Lucide icon name, resolved at render. */
  icon: string;
  reason: string;
  fromPriceUsd: number;
  items: RecommendedProduct[];
}

/** A bundle the current trip is eligible for. */
export interface ComboSuggestion {
  comboId: string;
  name: string;
  description: string;
  destination: string;
  /** Sum of the bundle's components at their standalone prices. */
  separatelyUsd: number;
  comboPrice: number;
  savingsUsd: number;
  items: {
    id: string;
    kind: BookingVertical;
    title: string;
    detail: string;
    merchantId: string;
    merchantName: string;
    priceUsd: number;
  }[];
  /** How many of the bundle's kinds the trip already covers. */
  matchedKinds: number;
  terms: string;
}
