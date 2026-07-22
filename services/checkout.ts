/**
 * checkout.ts — service seam for turning a checkout submission into a booking.
 *
 * `createBooking` is the mock stand-in for `POST /bookings`: it assembles the
 * {@link TravelerBooking}, its {@link Invoice} and a {@link PaymentTxn} from the
 * traveler's selection and returns them as one {@link CreatedBooking}. Today the
 * client persists that bundle locally (see `features/account/created-bookings`)
 * and merges it over the server dataset; a real backend drops the client store
 * and these bodies call the API instead.
 *
 * Timestamps are injected by the caller (`nowMs`) rather than read here, so the
 * module stays free of wall-clock reads at load — consistent with the seeded
 * mock-data rule. Randomness is derived deterministically from `nowMs` + slug.
 */

import type { BookingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import type {
  CardBrand,
  CreatedBooking,
  Invoice,
  PaymentStatus,
  PaymentTxn,
  TravelerBooking,
} from "@/types/traveler";
import type { Coupon } from "@/types/traveler";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { hashString } from "@/lib/random";
import { toISODate } from "@/lib/date";
import { mockDelay } from "./http";

/**
 * Verticals that take a request rather than an immediate payment — mirrors the
 * "Request quote" / "Start application" CTAs and "no payment taken" copy on the
 * listing page. These create a `pending` booking with a `due` invoice.
 */
const REQUEST_VERTICALS: BookingVertical[] = ["visa", "convention-hall"];

export function isRequestVertical(vertical: BookingVertical): boolean {
  return REQUEST_VERTICALS.includes(vertical);
}

/** Everything the checkout collects before creating the booking. */
export interface CreateBookingInput {
  listing: Listing;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: number;
  subtotalUsd: number;
  serviceFeeUsd: number;
  discountUsd: number;
  totalUsd: number;
  couponCode?: string;
  guestNames: string[];
  specialRequests?: string;
  paymentMethod: string;
  cardBrand: CardBrand;
  billTo: { name: string; email: string; country?: string };
  cancellationPolicy: string;
  /** Client timestamp at submit time (`Date.now()`). */
  nowMs: number;
}

/** Short uppercase base-36 token derived from a seed. */
function token(seed: string, length: number): string {
  let out = "";
  let h = hashString(seed);
  while (out.length < length) {
    out += (h % 36).toString(36).toUpperCase();
    h = Math.floor(h / 36) + hashString(out + seed);
  }
  return out.slice(0, length);
}

/**
 * Create a booking (mock). Returns the booking plus its invoice and payment.
 * The payment/invoice status reflects whether the vertical charges upfront or
 * takes a request; `nowMs` seeds all references and stamps the booking date.
 */
export function createBooking(input: CreateBookingInput): Promise<CreatedBooking> {
  const { listing, nowMs } = input;
  const isRequest = isRequestVertical(listing.vertical);
  const seed = `${listing.slug}:${nowMs}`;
  const ref = `SO-${token(seed, 6)}`;
  const suffix = token(`${seed}:id`, 8).toLowerCase();
  const bookingId = `bkg_local_${suffix}`;
  const invoiceId = `inv_local_${suffix}`;
  const paymentId = `pay_local_${suffix}`;
  const nowIso = new Date(nowMs).toISOString();

  const booking: TravelerBooking = {
    id: bookingId,
    reference: ref,
    listingId: listing.id,
    listingSlug: listing.slug,
    vertical: listing.vertical,
    title: listing.title,
    image: listing.image,
    location: listing.location.label,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights: input.nights,
    guests: input.guests,
    rooms: input.rooms,
    status: isRequest ? "pending" : "upcoming",
    totalUsd: input.totalUsd,
    paymentMethod: input.paymentMethod,
    invoiceId,
    bookedAt: nowIso,
    reviewed: false,
    guestNames: input.guestNames.length > 0 ? input.guestNames : [input.billTo.name],
    specialRequests: input.specialRequests || undefined,
    cancellationPolicy: input.cancellationPolicy,
  };

  const invoice: Invoice = {
    id: invoiceId,
    number: `INV-${token(`${seed}:inv`, 6)}`,
    bookingId,
    bookingRef: ref,
    title: listing.title,
    issuedAt: nowIso,
    dueAt: nowIso,
    status: isRequest ? "due" : "paid",
    subtotalUsd: input.subtotalUsd,
    taxesUsd: 0,
    feesUsd: input.serviceFeeUsd,
    discountUsd: input.discountUsd,
    totalUsd: input.totalUsd,
    billTo: input.billTo,
  };

  const paymentStatus: PaymentStatus = isRequest ? "pending" : "succeeded";
  const payment: PaymentTxn = {
    id: paymentId,
    bookingId,
    bookingRef: ref,
    description: `Booking ${listing.title}`,
    method: input.paymentMethod,
    brand: input.cardBrand,
    amountUsd: input.totalUsd,
    type: "charge",
    status: paymentStatus,
    date: nowIso,
  };

  return mockDelay({ booking, invoice, payment }, 900);
}

/** Result of applying a promo code to a subtotal. */
export type PromoResult =
  | { ok: true; coupon: Coupon; discountUsd: number }
  | { ok: false; reason: string };

/**
 * Validate a promo code against the traveler's wallet and a subtotal (mock).
 * Mirrors a `POST /checkout/promo` call: checks the code exists, is active, and
 * meets any minimum spend, then computes the discount.
 */
export function applyPromoCode(code: string, subtotalUsd: number): Promise<PromoResult> {
  const normalized = code.trim().toUpperCase();
  const coupon = ACCOUNT_DATA.coupons.find((c) => c.code.toUpperCase() === normalized);

  if (!coupon) return mockDelay({ ok: false, reason: "That code isn't valid." }, 500);
  if (coupon.status !== "active") {
    return mockDelay({ ok: false, reason: `This code is ${coupon.status}.` }, 500);
  }
  if (coupon.minSpendUsd && subtotalUsd < coupon.minSpendUsd) {
    return mockDelay(
      { ok: false, reason: `Spend at least $${coupon.minSpendUsd} to use this code.` },
      500,
    );
  }

  const raw =
    coupon.kind === "percent"
      ? (subtotalUsd * coupon.value) / 100
      : coupon.value;
  const discountUsd = Math.min(Math.round(raw), subtotalUsd);
  return mockDelay({ ok: true, coupon, discountUsd }, 500);
}

/** ISO check-in/out for verticals without a date range (visa) — appointment today. */
export function fallbackDates(nowMs: number): { checkIn: string; checkOut: string } {
  const iso = toISODate(new Date(nowMs));
  return { checkIn: iso, checkOut: iso };
}
