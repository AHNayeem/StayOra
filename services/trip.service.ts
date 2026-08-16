/**
 * trip.service.ts — building, pricing and booking a unified trip.
 *
 * Three responsibilities, and nothing else:
 *
 *  1. **Shaping** — turn a listing (or a flight offer, or a combo item) into a
 *     {@link TripItem}, complete with the merchant that owns it.
 *  2. **Pricing** — {@link priceTrip} is the only place a trip total is
 *     computed. It runs each component through the platform's own
 *     {@link priceBooking}, so taxes, fees and commission match exactly what
 *     the booking will carry.
 *  3. **Booking** — {@link createTripBooking} creates *one platform booking per
 *     component*, each with its own merchant, money, commission entry and
 *     lifecycle, grouped by a trip id. There is no "trip booking" record on the
 *     platform, by design: that is what makes partial success representable.
 *
 * Everything is async and mock-backed today; a real backend replaces the bodies
 * without changing a single caller.
 */

import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type { FlightOffer } from "@/types/flight";
import type {
  CardBrand,
  CreatedBooking,
  Invoice,
  PaymentTxn,
  TravelerBooking,
} from "@/types/traveler";
import type {
  ComboSuggestion,
  TripBooking,
  TripComponent,
  TripContext,
  TripItem,
  TripPriceLine,
  TripPricing,
  TripStatus,
} from "@/types/trip";
import { seatedTravelerCount, travelerCount } from "@/types/trip";
import type {
  Booking,
  BookingFailureReason,
  BookingSegment,
} from "@/features/dashboard/domain/types";
import {
  bookingService,
  availableBookingActions,
  commissionRateFor,
  getCancellationPolicy,
  getState as getDomainState,
  money as roundMoney,
  priceB2B,
  priceBooking,
  quoteRefund,
  toCountryCode,
} from "@/features/dashboard/domain";
import { MERCHANTS } from "@/features/dashboard/domain/seed";
import { BOOKING_CONFIG } from "@/constants/detail";
import { VERTICALS, listingHref } from "@/constants/verticals";
import {
  computeBookingPricing,
  durationBetween,
  guestsFromSelection,
  roomsFromSelection,
  type BookingSelection,
} from "@/lib/booking-pricing";
import { airportLabel, AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { dateOf } from "@/lib/flight-time";
import { hashString } from "@/lib/random";
import { mockDelay } from "./http";

/* -------------------------------------------------------------------------- */
/* Merchants                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Which merchants sell which product kind.
 *
 * A unified trip spans providers — the flight is the consolidator's, the hotel
 * the hotel group's, the transfer the transport operator's — and every
 * component must keep that ownership through to settlement. The catalog mocks
 * carry no merchant, so one is assigned deterministically from the product id:
 * the same listing always lands with the same provider.
 */
const MERCHANTS_BY_KIND: Record<BookingVertical, string[]> = {
  hotels: ["mrc_azure", "mrc_highline", "mrc_cedar"],
  apartments: ["mrc_marina", "mrc_cedar"],
  resorts: ["mrc_palm", "mrc_azure"],
  "shared-rooms": ["mrc_sunset"],
  "convention-hall": ["mrc_highline"],
  transport: ["mrc_transit"],
  tours: ["mrc_desert", "mrc_sunset"],
  activities: ["mrc_desert", "mrc_sunset"],
  flights: ["mrc_skyfare"],
  visa: ["mrc_visahub"],
};

/** The provider that owns a product, stable for a given product id. */
export function merchantForProduct(kind: BookingVertical, productId: string) {
  const pool = MERCHANTS_BY_KIND[kind] ?? ["mrc_azure"];
  const id = pool[hashString(productId) % pool.length];
  const merchant = MERCHANTS.find((m) => m.id === id) ?? MERCHANTS[0];
  return merchant;
}

/* -------------------------------------------------------------------------- */
/* Building trip items                                                         */
/* -------------------------------------------------------------------------- */

/** Stable, deterministic item id — re-adding the same product replaces it. */
function itemId(kind: string, ref: string): string {
  return `ti_${kind}_${ref}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

export interface ListingItemInput {
  listing: Listing;
  /** Dates + quantities from the booking widget, or trip-context defaults. */
  selection: BookingSelection;
  travelers: number;
  addedAt: string;
}

/**
 * Turn a listing plus a selection into a trip item, priced with exactly the
 * same maths the listing page and `/checkout` use.
 */
export function buildListingItem(input: ListingItemInput): TripItem {
  const { listing, selection, travelers, addedAt } = input;
  const config = BOOKING_CONFIG[listing.vertical];
  const pricing = computeBookingPricing(listing, config, selection);

  const quantity = roomsFromSelection(selection.quantities);
  const guests = guestsFromSelection(config, selection.quantities);
  const units = config.perDuration ? Math.max(1, pricing.duration) : 1;
  const merchant = merchantForProduct(listing.vertical, listing.id);

  const startDate =
    config.dateMode === "single" ? selection.singleDate : selection.checkIn;
  const endDate =
    config.dateMode === "range" ? selection.checkOut : selection.singleDate;

  const unitLabel = config.durationUnit;
  const detailParts: string[] = [];
  if (config.perDuration && units > 0) {
    detailParts.push(`${units} ${unitLabel}${units === 1 ? "" : "s"}`);
  }
  if (quantity > 1) detailParts.push(`${quantity} × ${config.summaryNoun.toLowerCase()}`);
  detailParts.push(`${Math.max(guests, travelers)} traveller${Math.max(guests, travelers) === 1 ? "" : "s"}`);

  return {
    id: itemId(listing.vertical, listing.slug),
    kind: listing.vertical,
    ref: {
      source: "catalog",
      vertical: listing.vertical,
      slug: listing.slug,
      listingId: listing.id,
    },
    title: listing.title,
    image: listing.image,
    destination: listing.location.city ?? listing.location.label,
    countryCode: toCountryCode(listing.location.countryCode, listing.location.country),
    merchantId: merchant.id,
    merchantName: merchant.name,
    unitPriceUsd: listing.price.amount,
    quantity,
    units,
    unitLabel,
    startDate: startDate || "",
    endDate: endDate || startDate || "",
    travelers: Math.max(guests, travelers),
    subtotalUsd: roundMoney(listing.price.amount * units * quantity),
    detail: detailParts.join(" · "),
    capacity: capacityOfListing(listing),
    href: listingHref(listing),
    addedAt,
  };
}

function capacityOfListing(listing: Listing): number | undefined {
  switch (listing.vertical) {
    case "apartments":
      return listing.guests;
    case "shared-rooms":
      return listing.bedsAvailable;
    case "transport":
      return listing.seats;
    case "tours":
      return listing.groupSize;
    case "convention-hall":
      return listing.capacity;
    default:
      return undefined;
  }
}

/** Turn a selected flight offer into a trip item. */
export function buildFlightItem(offer: FlightOffer, addedAt: string): TripItem {
  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];
  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const destination = AIRPORTS_BY_CODE[last.toCode];
  const merchant = merchantForProduct("flights", offer.airlineCode);
  const people = offer.passengers.adults + offer.passengers.children + offer.passengers.infants;

  const route =
    offer.tripType === "round-trip"
      ? `${airportLabel(first.fromCode)} ⇄ ${airportLabel(last.toCode)}`
      : `${airportLabel(first.fromCode)} → ${airportLabel(last.toCode)}`;

  return {
    id: itemId("flights", offer.id),
    kind: "flights",
    ref: { source: "flight", offerId: offer.id },
    title: `${airline?.name ?? offer.airlineCode} · ${route}`,
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
    destination: destination?.city ?? last.toCode,
    merchantId: merchant.id,
    merchantName: merchant.name,
    unitPriceUsd: roundMoney(offer.fare.totalUsd),
    quantity: 1,
    units: 1,
    startDate: dateOf(first.departLocal),
    endDate: dateOf(last.arriveLocal),
    travelers: people,
    subtotalUsd: roundMoney(offer.fare.totalUsd),
    detail: `${offer.fareBrand} · ${people} traveller${people === 1 ? "" : "s"} · ${
      offer.tripType === "round-trip" ? "Return" : "One way"
    }`,
    capacity: offer.seatsAvailable,
    href: `/flights/${encodeURIComponent(offer.id)}`,
    addedAt,
  };
}

/** Turn a combo's components into trip items, preserving each item's merchant. */
export function buildComboItems(
  suggestion: ComboSuggestion,
  context: TripContext,
  addedAt: string,
): TripItem[] {
  const start = context.departureDate ?? "";
  const end = context.returnDate ?? start;
  const people = Math.max(1, travelerCount(context.travelers));

  return suggestion.items.map((item) => ({
    id: itemId(item.kind, item.id),
    kind: item.kind,
    ref: { source: "combo" as const, comboId: suggestion.comboId, comboItemId: item.id },
    title: item.title,
    image: COMBO_IMAGE[item.kind] ?? FALLBACK_IMAGE,
    destination: suggestion.destination,
    merchantId: item.merchantId,
    merchantName: item.merchantName,
    unitPriceUsd: item.priceUsd,
    quantity: 1,
    units: 1,
    startDate: start,
    endDate: end,
    travelers: people,
    subtotalUsd: item.priceUsd,
    detail: item.detail,
    addedAt,
  }));
}

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const FALLBACK_IMAGE = img("photo-1476514525535-07fb3b4ae5f1");

/** Representative imagery for combo components, which carry no image of their own. */
const COMBO_IMAGE: Partial<Record<BookingVertical, string>> = {
  hotels: img("photo-1566073771259-6a8506099945"),
  apartments: img("photo-1522708323590-d24dbb6b0267"),
  resorts: img("photo-1571896349842-33c89424de2d"),
  "shared-rooms": img("photo-1555854877-bab0e564b8d5"),
  flights: img("photo-1436491865332-7a61a109cc05"),
  transport: img("photo-1502877338535-766e1452684a"),
  tours: img("photo-1476514525535-07fb3b4ae5f1"),
  activities: img("photo-1533105079780-92b9be482077"),
  visa: img("photo-1502920917128-1aa500764cbd"),
  "convention-hall": img("photo-1511578314322-379afb476865"),
};

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Bundle savings, by how many *different* product kinds the trip combines.
 *
 * A deterministic prototype rule, kept in one place so the cart, the checkout
 * and the created booking can never disagree. A real pricing API returns the
 * same shape from {@link priceTrip}'s seam.
 */
const BUNDLE_RATES: { minKinds: number; rate: number }[] = [
  { minKinds: 4, rate: 0.08 },
  { minKinds: 3, rate: 0.06 },
  { minKinds: 2, rate: 0.04 },
];

/** The bundle rate a set of items qualifies for (0 when there's nothing to bundle). */
export function bundleRateFor(items: TripItem[]): number {
  const kinds = new Set(items.map((i) => i.kind)).size;
  return BUNDLE_RATES.find((tier) => kinds >= tier.minKinds)?.rate ?? 0;
}

export interface PriceTripInput {
  items: TripItem[];
  /** Coupon saving already validated against the traveller's wallet. */
  couponDiscountUsd?: number;
  /** Bundle the traveller applied, when its price replaces the item sum. */
  combo?: { comboId: string; comboPrice: number } | null;
  /**
   * Agency rate build-up, when an agency is booking. Mirrors what
   * {@link priceB2B} does inside `bookingService.create`, so the quote the
   * agency sees is the quote it is invoiced.
   */
  b2b?: { netRateDiscount: number; markupRate: number } | null;
}

/**
 * Price a whole trip: per-component money that matches what each booking will
 * carry, plus the trip-level roll-up the cart shows.
 *
 * The bundle saving is apportioned across components pro-rata by list price,
 * which is what keeps per-merchant commission honest on a multi-provider trip —
 * the same approach the platform's own combo allocation takes.
 */
export function priceTrip(input: PriceTripInput): TripPricing {
  const { items, couponDiscountUsd = 0, combo = null, b2b = null } = input;

  /** Base + markup for one component, honouring agency net rates. */
  const rates = (listPrice: number) => {
    if (!b2b) return { base: listPrice, markup: 0 };
    const priced = priceB2B({
      publicRate: listPrice,
      netRateDiscount: b2b.netRateDiscount,
      markupRate: b2b.markupRate,
    });
    return { base: priced.netRate, markup: priced.markup };
  };

  const subtotal = roundMoney(items.reduce((sum, i) => sum + i.subtotalUsd, 0));

  // A combo replaces the sum of its parts with the bundle price; otherwise the
  // multi-product rate applies.
  const bundleRate = combo ? 0 : bundleRateFor(items);
  const bundleDiscount = combo
    ? roundMoney(Math.max(0, subtotal - combo.comboPrice))
    : roundMoney(subtotal * bundleRate);

  const coupon = roundMoney(Math.min(couponDiscountUsd, Math.max(0, subtotal - bundleDiscount)));
  const totalDiscount = roundMoney(bundleDiscount + coupon);

  const lines: TripPriceLine[] = items.map((item) => {
    const share = subtotal > 0 ? item.subtotalUsd / subtotal : 0;
    const discount = roundMoney(totalDiscount * share);
    const { base, markup } = rates(item.subtotalUsd);
    const merchant = MERCHANTS.find((m) => m.id === item.merchantId);
    const rate = commissionRateFor(item.kind, merchant?.commissionRate);
    const priced = priceBooking({
      base,
      markup,
      discount,
      commissionRate: rate,
      // Each leg is taxed in its own jurisdiction — a Dubai hotel and a Paris
      // tour on the same trip carry different tax lines.
      taxContext: {
        productKind: item.kind,
        countryCode: item.countryCode,
        nights: Math.max(1, item.units),
        units: Math.max(1, item.quantity),
        guests: Math.max(1, item.travelers),
      },
    });

    return {
      itemId: item.id,
      title: item.title,
      kind: item.kind,
      merchantName: item.merchantName,
      baseUsd: priced.base,
      discountUsd: priced.discount,
      netSaleUsd: priced.netSale,
      taxesUsd: priced.taxes,
      feesUsd: priced.fees,
      totalUsd: priced.total,
      commissionUsd: priced.commission,
      commissionRate: priced.commissionRate,
    };
  });

  const sum = (pick: (l: TripPriceLine) => number) =>
    roundMoney(lines.reduce((n, l) => n + pick(l), 0));

  const total = sum((l) => l.totalUsd);

  // What the same products would cost booked one at a time: no bundle saving,
  // no coupon — everything else identical.
  const separately = roundMoney(
    items.reduce((n, item) => {
      const merchant = MERCHANTS.find((m) => m.id === item.merchantId);
      const rate = commissionRateFor(item.kind, merchant?.commissionRate);
      const { base, markup } = rates(item.subtotalUsd);
      return n + priceBooking({ base, markup, commissionRate: rate }).total;
    }, 0),
  );

  return {
    currency: "USD",
    lines,
    subtotalUsd: subtotal,
    bundleDiscountUsd: bundleDiscount,
    couponDiscountUsd: coupon,
    discountUsd: totalDiscount,
    taxesUsd: sum((l) => l.taxesUsd),
    feesUsd: sum((l) => l.feesUsd),
    totalUsd: total,
    separatelyUsd: separately,
    savingsUsd: roundMoney(Math.max(0, separately - total)),
    commissionUsd: sum((l) => l.commissionUsd),
    bundleRatePct: combo ? 0 : roundMoney(bundleRate * 100),
  };
}

/* -------------------------------------------------------------------------- */
/* Availability                                                                */
/* -------------------------------------------------------------------------- */

export interface AvailabilityResult {
  available: boolean;
  reason?: BookingFailureReason;
  /** Customer-facing explanation. */
  message?: string;
}

/**
 * Can this component actually be delivered for this party?
 *
 * Checked before the booking is confirmed, exactly as a provider call would be:
 * a four-seat transfer can't take six travellers, and a dorm with two beds
 * can't sleep four. This is what produces a genuinely failed component — and
 * therefore a partially-confirmed trip — rather than a simulated coin flip.
 */
export function checkAvailability(item: TripItem): AvailabilityResult {
  if (item.capacity !== undefined && item.travelers > item.capacity * Math.max(1, item.quantity)) {
    const reason: BookingFailureReason =
      item.kind === "flights"
        ? "seat_unavailable"
        : item.kind === "hotels" || item.kind === "apartments" || item.kind === "resorts"
          ? "room_unavailable"
          : "inventory_unavailable";
    return {
      available: false,
      reason,
      message: `${item.title} takes up to ${item.capacity * Math.max(1, item.quantity)} travellers — your trip has ${item.travelers}.`,
    };
  }
  if (!item.startDate) {
    return {
      available: false,
      reason: "provider_rejected",
      message: `${item.title} needs a date before it can be confirmed.`,
    };
  }
  return { available: true };
}

/* -------------------------------------------------------------------------- */
/* Creating the unified booking                                                */
/* -------------------------------------------------------------------------- */

/** Short uppercase token derived from a seed — mirrors `services/checkout`. */
function token(seed: string, length: number): string {
  let out = "";
  let h = hashString(seed);
  while (out.length < length) {
    out += (h % 36).toString(36).toUpperCase();
    h = Math.floor(h / 36) + hashString(out + seed);
  }
  return out.slice(0, length);
}

export interface CreateTripBookingInput {
  context: TripContext;
  items: TripItem[];
  pricing: TripPricing;
  customer: { name: string; email: string; country?: string };
  travelerNames: string[];
  segment: BookingSegment;
  /** B2B only — the agency/corporate account the trip is billed to. */
  organizationId?: string;
  organizationName?: string;
  paymentMethod: string;
  cardBrand: CardBrand;
  combo?: { comboId: string; comboName: string } | null;
  couponCode?: string;
  /** Client timestamp at submit time (`Date.now()`). */
  nowMs: number;
}

/** What a unified checkout produced, across every surface it touches. */
export interface CreatedTripBooking {
  trip: TripBooking;
  /** One `/account/bookings` record per confirmed or pending component. */
  created: CreatedBooking[];
  /** Components the provider couldn't deliver. */
  failed: TripComponent[];
}

/** Roll a set of component statuses up into one trip status. */
export function deriveTripStatus(components: Pick<TripComponent, "status">[]): TripStatus {
  if (components.length === 0) return "pending";
  const has = (...statuses: string[]) =>
    components.some((c) => statuses.includes(c.status));
  const every = (...statuses: string[]) =>
    components.every((c) => statuses.includes(c.status));

  if (every("cancelled", "refunded")) return "cancelled";
  if (every("completed")) return "completed";
  if (every("failed")) return "failed";
  if (has("refund_pending", "refund_processing", "refund_failed")) return "refund_pending";

  const confirmed = components.filter((c) =>
    ["confirmed", "checked_in", "completed"].includes(c.status),
  ).length;
  const unresolved = components.filter((c) =>
    ["initiated", "payment_pending", "payment_processing"].includes(c.status),
  ).length;

  if (confirmed === components.length) return "confirmed";
  if (confirmed > 0) return "partially_confirmed";
  if (unresolved > 0) return "pending";
  return "failed";
}

/** Map a platform booking's state onto the traveller-facing booking status. */
function travelerStatusFor(booking: Booking): TravelerBooking["status"] {
  switch (booking.status) {
    case "confirmed":
    case "checked_in":
      return "upcoming";
    case "completed":
      return "completed";
    case "cancelled":
    case "cancellation_requested":
      return "cancelled";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * Book a trip.
 *
 * One platform booking is created per component — same merchant, same
 * commission ledger, same lifecycle the dashboard already drives — and each is
 * confirmed or failed on its own. A failed hotel never touches a confirmed
 * flight. The trip record returned is purely the grouping.
 *
 * Alongside each component, the traveller-facing booking/invoice/payment triple
 * is produced, exactly as the stay and flight checkouts do, so the trip shows up
 * in `/account/bookings`, `/account/invoices` and `/account/payments` with no
 * special-casing anywhere.
 */
export async function createTripBooking(
  input: CreateTripBookingInput,
): Promise<CreatedTripBooking> {
  const { context, items, pricing, customer, nowMs } = input;
  const nowIso = new Date(nowMs).toISOString();
  const seed = `${customer.email}:${nowMs}`;
  const tripId = `trp_${token(`${seed}:id`, 8).toLowerCase()}`;
  const tripRef = `TRIP-${token(seed, 5)}`;

  const components: TripComponent[] = [];
  const created: CreatedBooking[] = [];

  for (const item of items) {
    const line = pricing.lines.find((l) => l.itemId === item.id);
    if (!line) continue;

    const availability = checkAvailability(item);

    // Each component is created through the platform's own booking service, so
    // it lands in the same tables with its own commission entry and timeline.
    let booking = await bookingService.create(
      {
        productKind: item.kind,
        productTitle: item.title,
        destination: item.destination,
        destinationCountryCode: item.countryCode,
        merchantId: item.merchantId,
        customerName: customer.name,
        customerEmail: customer.email,
        segment: input.segment,
        organizationId: input.organizationId,
        startAt: item.startDate,
        endAt: item.endDate || item.startDate,
        quantity: item.quantity,
        baseAmount: item.subtotalUsd,
        travelerNames: input.travelerNames,
        channel: input.segment === "b2b" ? "agency" : "web",
        tripId,
        tripRef,
        extraDiscount:
          line.discountUsd > 0
            ? {
                kind: "combo",
                ref: input.combo?.comboId ?? tripRef,
                label: input.combo
                  ? `${input.combo.comboName} bundle saving`
                  : "Unified trip saving",
                amount: line.discountUsd,
              }
            : undefined,
      },
      {
        id: `cus_${customer.email}`,
        name: customer.name,
        role: "customer",
      },
    );

    // Take payment, then ask the provider. Either it confirms, or it fails on
    // its own — no other component is affected.
    booking = (
      await bookingService.transition(booking.id, "capture_payment", {
        note: `Paid with ${input.paymentMethod} as part of ${tripRef}.`,
      })
    ).booking;

    if (availability.available) {
      booking = (
        await bookingService.transition(booking.id, "confirm", {
          note: `Provider confirmed as part of ${tripRef}.`,
        })
      ).booking;
    } else {
      booking = (
        await bookingService.transition(booking.id, "mark_failed", {
          failureReason: availability.reason,
          note: availability.message,
        })
      ).booking;
    }

    const component: TripComponent = {
      bookingId: booking.id,
      reference: booking.reference,
      kind: item.kind,
      title: item.title,
      detail: item.detail,
      image: item.image,
      merchantId: item.merchantId,
      merchantName: item.merchantName,
      startDate: item.startDate,
      endDate: item.endDate || item.startDate,
      travelers: item.travelers,
      totalUsd: line.totalUsd,
      status: booking.status,
      failureReason: booking.failureReason,
      failureNote: booking.failureNote,
      href: item.href,
      invoiceId: `inv_${booking.id}`,
    };

    // The traveller-facing triple — only for components that actually stand.
    if (booking.status !== "failed") {
      const travelerBookingId = booking.id;
      const invoiceId = `inv_${booking.id}`;
      const nights = durationBetween(component.startDate, component.endDate);

      const travelerBooking: TravelerBooking = {
        id: travelerBookingId,
        reference: booking.reference,
        listingId: item.ref.source === "catalog" ? item.ref.listingId : booking.id,
        listingSlug: item.ref.source === "catalog" ? item.ref.slug : booking.id,
        vertical: item.kind,
        title: item.title,
        image: item.image,
        location: item.destination,
        checkIn: component.startDate,
        checkOut: component.endDate,
        nights,
        guests: item.travelers,
        rooms: item.quantity,
        status: travelerStatusFor(booking),
        totalUsd: line.totalUsd,
        paymentMethod: input.paymentMethod,
        invoiceId,
        bookedAt: nowIso,
        reviewed: false,
        guestNames: input.travelerNames,
        cancellationPolicy: `Part of trip ${tripRef} — cancelling this component leaves the rest of your trip in place.`,
      };

      const invoice: Invoice = {
        id: invoiceId,
        number: booking.invoiceNumber,
        bookingId: travelerBookingId,
        bookingRef: booking.reference,
        title: `${VERTICALS[item.kind].label} · ${item.title}`,
        issuedAt: nowIso,
        dueAt: nowIso,
        status: "paid",
        subtotalUsd: line.baseUsd,
        taxesUsd: line.taxesUsd,
        feesUsd: line.feesUsd,
        discountUsd: line.discountUsd,
        totalUsd: line.totalUsd,
        billTo: {
          name: input.organizationName ?? customer.name,
          email: customer.email,
          country: customer.country,
        },
      };

      const payment: PaymentTxn = {
        id: `pay_${booking.id}`,
        bookingId: travelerBookingId,
        bookingRef: booking.reference,
        description: `${tripRef} · ${item.title}`,
        method: input.paymentMethod,
        brand: input.cardBrand,
        amountUsd: line.totalUsd,
        type: "charge",
        status: "succeeded",
        date: nowIso,
      };

      component.travelerBookingId = travelerBookingId;
      created.push({ booking: travelerBooking, invoice, payment });
    }

    components.push(component);
  }

  const dates = components.map((c) => c.startDate).filter(Boolean).sort();
  const ends = components.map((c) => c.endDate).filter(Boolean).sort();

  const trip: TripBooking = {
    id: tripId,
    reference: tripRef,
    createdAt: nowIso,
    destination: context.destination?.city ?? components[0]?.title ?? "Trip",
    destinationLabel: context.destination?.label ?? context.destination?.city ?? "Your trip",
    startDate: dates[0] ?? context.departureDate ?? "",
    endDate: ends[ends.length - 1] ?? context.returnDate ?? dates[0] ?? "",
    travelers: context.travelers,
    segment: input.segment,
    organizationName: input.organizationName,
    comboId: input.combo?.comboId,
    comboName: input.combo?.comboName,
    currency: pricing.currency,
    subtotalUsd: pricing.subtotalUsd,
    discountUsd: pricing.discountUsd,
    taxesUsd: pricing.taxesUsd,
    feesUsd: pricing.feesUsd,
    // Only the components that stood are actually charged.
    totalUsd: roundMoney(
      components
        .filter((c) => c.status !== "failed")
        .reduce((n, c) => n + c.totalUsd, 0),
    ),
    savingsUsd: pricing.savingsUsd,
    commissionUsd: pricing.commissionUsd,
    paymentMethod: input.paymentMethod,
    components,
  };

  return mockDelay(
    { trip, created, failed: components.filter((c) => c.status === "failed") },
    600,
  );
}

/* -------------------------------------------------------------------------- */
/* Managing a booked trip                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Retry one failed component: re-attempt the charge, re-check availability and
 * confirm if the provider now has it. Nothing else in the trip is touched.
 */
export async function retryTripComponent(
  bookingId: string,
  item: Pick<TripItem, "capacity" | "travelers" | "quantity" | "title" | "kind" | "startDate">,
): Promise<Booking> {
  let booking = (await bookingService.transition(bookingId, "retry_payment")).booking;
  booking = (await bookingService.transition(bookingId, "capture_payment")).booking;

  const availability = checkAvailability(item as TripItem);
  if (availability.available) {
    booking = (
      await bookingService.transition(bookingId, "confirm", {
        note: "Retried and confirmed by the traveller.",
      })
    ).booking;
  } else {
    booking = (
      await bookingService.transition(bookingId, "mark_failed", {
        failureReason: availability.reason,
        note: availability.message,
      })
    ).booking;
  }
  return booking;
}

/**
 * Cancel one component of a trip and raise its refund. The rest of the trip is
 * deliberately left alone — cancelling a hotel is not cancelling a flight.
 */
export async function cancelTripComponent(
  bookingId: string,
  note?: string,
): Promise<{ booking: Booking; refundId?: string }> {
  await bookingService.transition(bookingId, "cancel", {
    note: note ?? "Cancelled by the traveller from My Trips.",
  });
  const refunded = await bookingService.transition(bookingId, "initiate_refund", {
    refundReason: "customer_cancellation",
  });
  return { booking: refunded.booking, refundId: refunded.refund?.id };
}

/* -------------------------------------------------------------------------- */
/* Whole-trip cancellation                                                     */
/* -------------------------------------------------------------------------- */

/** What cancelling one leg of a trip would return, before anything is done. */
export interface TripLegQuote {
  bookingId: string;
  reference: string;
  title: string;
  kind: BookingVertical;
  /** False when the leg is already cancelled, refunded or failed. */
  cancellable: boolean;
  /** Why not, when it isn't — the policy's own words. */
  reason?: string;
  refundUsd: number;
  cancellationFeeUsd: number;
  policyLabel: string;
}

export interface TripCancellationQuote {
  legs: TripLegQuote[];
  cancellableCount: number;
  totalRefundUsd: number;
  totalFeeUsd: number;
  /** Legs that can't be cancelled and will be left exactly as they are. */
  untouched: TripLegQuote[];
}

/**
 * Quote cancelling every leg of a trip at once.
 *
 * Each leg is quoted against **its own** supplier's policy — a non-refundable
 * tour beside a flexible hotel returns two different numbers, and the traveller
 * sees both before committing. That is the whole difficulty of multi-supplier
 * refunds, and hiding it behind one figure would misrepresent what they get
 * back. Pure: nothing is cancelled, nothing is written.
 */
export function quoteTripCancellation(
  trip: TripBooking,
  at = new Date().toISOString(),
): TripCancellationQuote {
  const bookings = getDomainState().bookings;
  const legs: TripLegQuote[] = trip.components.map((component) => {
    const booking = bookings.find((b) => b.id === component.bookingId);
    const base: TripLegQuote = {
      bookingId: component.bookingId,
      reference: component.reference,
      title: component.title,
      kind: component.kind,
      cancellable: false,
      refundUsd: 0,
      cancellationFeeUsd: 0,
      policyLabel: "—",
    };

    if (!booking) {
      return { ...base, reason: "This booking is no longer on file." };
    }
    const canCancel = availableBookingActions(booking).some((a) => a.id === "cancel");
    if (!canCancel) {
      return {
        ...base,
        reason: `Already ${booking.status.replace(/_/g, " ")}.`,
        policyLabel: getCancellationPolicy(booking.cancellationPolicyId).label,
      };
    }

    const quote = quoteRefund({ booking, reason: "customer_cancellation", at });
    return {
      ...base,
      cancellable: true,
      reason: quote.reason,
      refundUsd: quote.refundAmount,
      cancellationFeeUsd: quote.cancellationFee,
      policyLabel: quote.policy.label,
    };
  });

  const cancellable = legs.filter((leg) => leg.cancellable);
  return {
    legs,
    cancellableCount: cancellable.length,
    totalRefundUsd: roundMoney(cancellable.reduce((sum, leg) => sum + leg.refundUsd, 0)),
    totalFeeUsd: roundMoney(cancellable.reduce((sum, leg) => sum + leg.cancellationFeeUsd, 0)),
    untouched: legs.filter((leg) => !leg.cancellable),
  };
}

export interface TripCancellationResult {
  cancelled: { bookingId: string; reference: string; title: string; refundId?: string }[];
  /** Legs that could not be cancelled, with the reason. */
  skipped: { bookingId: string; title: string; reason: string }[];
  refundIds: string[];
}

/**
 * Cancel every cancellable leg of a trip and raise each supplier's refund.
 *
 * Deliberately **not atomic**, because the real world isn't: each leg is a
 * separate contract with a separate supplier. One leg failing to cancel must not
 * roll back the others, so every leg is attempted and the ones that couldn't be
 * are reported rather than swallowed. That report is what the UI shows.
 */
export async function cancelWholeTrip(
  trip: TripBooking,
  note = "Whole trip cancelled by the traveller.",
): Promise<TripCancellationResult> {
  const result: TripCancellationResult = { cancelled: [], skipped: [], refundIds: [] };
  // Decided by the same quote the traveller was shown, so what runs is exactly
  // what the dialog promised — and a leg already cancelled is skipped rather
  // than pushed at the state machine to see whether it throws.
  const quote = quoteTripCancellation(trip);
  const cancellable = new Map(quote.legs.map((leg) => [leg.bookingId, leg]));

  for (const component of trip.components) {
    const leg = cancellable.get(component.bookingId);
    if (!leg?.cancellable) {
      result.skipped.push({
        bookingId: component.bookingId,
        title: component.title,
        reason: leg?.reason ?? "This booking can't be cancelled at its current stage.",
      });
      continue;
    }
    try {
      const { refundId } = await cancelTripComponent(component.bookingId, note);
      result.cancelled.push({
        bookingId: component.bookingId,
        reference: component.reference,
        title: component.title,
        refundId,
      });
      if (refundId) result.refundIds.push(refundId);
    } catch (error) {
      result.skipped.push({
        bookingId: component.bookingId,
        title: component.title,
        reason:
          error instanceof Error
            ? error.message
            : "This booking can't be cancelled at its current stage.",
      });
    }
  }

  return result;
}

/** Seat-count helper for flight components added from an offer. */
export function seatedFor(context: TripContext): number {
  return Math.max(1, seatedTravelerCount(context.travelers));
}
