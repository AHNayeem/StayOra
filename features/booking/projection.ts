/**
 * Domain → customer projection.
 *
 * The platform has exactly one booking record: `Booking` in the domain layer.
 * The `/account` screens were built against `TravelerBooking`, so rather than
 * keep two sources of truth this module *derives* the customer view model from
 * the domain record. Nothing here stores anything — change the domain booking
 * and every customer screen changes with it, which is what makes an admin
 * status change show up in the traveller's account.
 */

import type { BookingVertical } from "@/types/booking";
import type {
  BookingStatus as TravelerStatus,
  Invoice,
  PaymentTxn,
  TravelerBooking,
} from "@/types/traveler";
import type { CardBrand, InvoiceStatus, PaymentStatus } from "@/types/traveler";
import { GALLERY_POOL } from "@/constants/detail";
import type {
  Booking,
  BookingStatus,
  PaymentStatus as DomainPaymentStatus,
} from "@/features/dashboard/domain";

/**
 * Lifecycle mapping. The customer sees fewer states than operations do, but the
 * ones that change what they can *do* — cancellation requested, refund in
 * progress — are kept distinct rather than folded into "cancelled".
 */
const STATUS_MAP: Record<BookingStatus, TravelerStatus> = {
  initiated: "pending",
  payment_pending: "pending",
  payment_processing: "pending",
  confirmed: "upcoming",
  checked_in: "checked_in",
  completed: "completed",
  cancellation_requested: "cancellation_requested",
  cancelled: "cancelled",
  failed: "failed",
  refund_pending: "refund_pending",
  refund_processing: "refund_pending",
  refunded: "refunded",
  refund_failed: "refund_pending",
};

export function toTravelerStatus(status: BookingStatus): TravelerStatus {
  return STATUS_MAP[status] ?? "pending";
}

/** A believable image for a booking that predates the catalogue link. */
function fallbackImage(booking: Booking): string {
  const vertical = (booking.productKind === "combo" ? "hotels" : booking.productKind) as
    | BookingVertical
    | undefined;
  const pool = vertical ? GALLERY_POOL[vertical] : undefined;
  if (!pool?.length) return GALLERY_POOL.hotels[0];
  let hash = 0;
  for (let i = 0; i < booking.id.length; i += 1) hash = (hash * 31 + booking.id.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length];
}

/** Slug used when a seeded booking has no catalogue link of its own. */
function slugFor(booking: Booking): string {
  return (
    booking.listing?.slug ??
    booking.productTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

export function bookingVertical(booking: Booking): BookingVertical {
  if (booking.listing?.vertical) return booking.listing.vertical;
  return booking.productKind === "combo" ? "hotels" : booking.productKind;
}

/** Human summary of the cancellation terms, for the customer-facing card. */
function policyCopy(booking: Booking): string {
  if (booking.stay && !booking.stay.refundable) {
    return "Non-refundable rate — no refund is due if you cancel.";
  }
  switch (booking.cancellationPolicyId) {
    case "flexible":
      return "Free cancellation up to 24 hours before check-in.";
    case "moderate":
      return "Free cancellation up to 5 days before check-in; 50% refunded after that.";
    case "strict":
      return "50% refunded up to 7 days before check-in; no refund after that.";
    case "non_refundable":
      return "Non-refundable — no refund is due if you cancel.";
  }
}

/** Project a domain booking into the account view model. */
export function toTravelerBooking(booking: Booking): TravelerBooking {
  return {
    id: booking.id,
    reference: booking.reference,
    listingId: booking.listing?.id ?? `lst_${slugFor(booking)}`,
    listingSlug: slugFor(booking),
    vertical: bookingVertical(booking),
    title: booking.productTitle,
    image: booking.listing?.image ?? fallbackImage(booking),
    location: booking.destination,
    checkIn: booking.startAt,
    checkOut: booking.endAt,
    nights: booking.nights,
    guests: booking.stay?.guests ?? booking.travelers.length,
    rooms: booking.stay?.units ?? booking.quantity,
    status: toTravelerStatus(booking.status),
    totalUsd: booking.money.total,
    paymentMethod: booking.payment.method,
    invoiceId: `inv_${booking.id}`,
    bookedAt: booking.createdAt,
    reviewed: false,
    failureReason: booking.failureNote,
    guestNames: booking.travelers.map((t) => t.fullName),
    specialRequests: booking.specialRequests,
    cancellationPolicy: policyCopy(booking),
  };
}

const INVOICE_STATUS: Record<string, InvoiceStatus> = {
  captured: "paid",
  authorized: "paid",
  partially_refunded: "paid",
  refunded: "refunded",
  refund_pending: "paid",
  pending: "due",
  processing: "due",
  failed: "void",
  voided: "void",
};

/** The billing document for a booking, derived from its money breakdown. */
export function toInvoice(booking: Booking): Invoice {
  const addOns = (booking.addOns ?? []).reduce((sum, a) => sum + a.total, 0);
  return {
    id: `inv_${booking.id}`,
    number: booking.invoiceNumber,
    bookingId: booking.id,
    bookingRef: booking.reference,
    title: booking.productTitle,
    issuedAt: booking.createdAt,
    dueAt: booking.paymentPlan?.balanceDueAt ?? booking.createdAt,
    status: INVOICE_STATUS[booking.payment.status] ?? "due",
    subtotalUsd: booking.money.base - addOns,
    taxesUsd: booking.money.taxes,
    feesUsd: booking.money.fees,
    discountUsd: booking.money.discount,
    totalUsd: booking.money.total,
    billTo: {
      name: booking.customer.name,
      email: booking.customer.email,
      country: booking.customer.organizationName,
    },
  };
}

const TXN_STATUS: Record<DomainPaymentStatus, PaymentStatus> = {
  pending: "pending",
  processing: "pending",
  authorized: "succeeded",
  captured: "succeeded",
  failed: "failed",
  refund_pending: "pending",
  partially_refunded: "refunded",
  refunded: "refunded",
  voided: "failed",
};

function brandOf(instrument: string): CardBrand {
  const lower = instrument.toLowerCase();
  if (lower.includes("master")) return "mastercard";
  if (lower.includes("amex") || lower.includes("express")) return "amex";
  if (lower.includes("paypal") || lower.includes("wallet")) return "paypal";
  return "visa";
}

/** The charge line for a booking, plus a refund line when money went back. */
export function toPaymentTxns(booking: Booking): PaymentTxn[] {
  const charge: PaymentTxn = {
    id: booking.payment.id,
    bookingId: booking.id,
    bookingRef: booking.reference,
    description: `Booking ${booking.productTitle}`,
    method: booking.payment.method,
    brand: brandOf(booking.payment.instrument),
    amountUsd: booking.payment.amount,
    type: "charge",
    status: TXN_STATUS[booking.payment.status] ?? "pending",
    date: booking.payment.capturedAt ?? booking.createdAt,
  };
  if (booking.money.refunded <= 0) return [charge];
  return [
    charge,
    {
      id: `${booking.payment.id}_rfd`,
      bookingId: booking.id,
      bookingRef: booking.reference,
      description: `Refund — ${booking.productTitle}`,
      method: booking.payment.method,
      brand: brandOf(booking.payment.instrument),
      amountUsd: booking.money.refunded,
      type: "refund",
      status: "refunded",
      date: booking.updatedAt,
    },
  ];
}
