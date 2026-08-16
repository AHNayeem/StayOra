/**
 * MockBookingRepository — availability, pricing, confirmation, cancellation.
 *
 * This is the repository that makes the "AI can't invent anything" rule
 * structural. Every number it returns comes out of the platform's own engines:
 *
 *   availability → `domain/inventory.checkAvailability`
 *   price        → `features/booking/checkout-service.quoteCheckout`
 *   hold         → `domain/inventory.holdInventory`
 *   payment      → the injected {@link PaymentRepository}
 *   booking      → `features/booking/checkout-service.confirmBooking`
 *   refund       → `domain/money.quoteRefund`
 *
 * They are the same calls the checkout page makes, so an assistant-made booking
 * is indistinguishable from one made through the UI — same inventory consumed,
 * same money split, same lifecycle, same audit trail. Swapping this class for an
 * `ApiBookingRepository` that posts to `/bookings` changes nothing above it.
 */

import type {
  AIAvailabilityResult,
  AIBookingQuote,
  AIBookingRecord,
  AICancellationQuote,
  AIPriceLine,
} from "@/types/ai";
import type { ListingVertical } from "@/types/booking";
import type { Listing } from "@/types/catalog";
import {
  bookingService,
  cheapestQuote,
  getCancellationPolicy,
  getRoomTypes,
  getRatePlan,
  getState,
  isPerNight,
  quoteRefund,
  quoteStay,
  ratePlansFor,
  releaseHold,
  type Booking,
  type BookingMoney,
  type PaymentAttempt,
} from "@/features/dashboard/domain";
import { attemptsForIntent } from "@/features/dashboard/domain";
import {
  abandonHold,
  confirmBooking,
  createHold,
  quoteCheckout,
  type CheckoutQuote,
  type CheckoutSelection,
} from "@/features/booking/checkout-service";
import { toPropertyRef } from "@/features/booking/property";
import type {
  BookingCancelResult,
  BookingConfirmInput,
  BookingConfirmResult,
  BookingQuoteInput,
  BookingRepository,
  ListingRepository,
  PaymentRepository,
} from "./types";

/** Fallback identity for a quote when the traveller hasn't signed in yet. */
const ANONYMOUS_EMAIL = "guest@otithee.example";

/**
 * Turn the checkout's authoritative money split into the assistant's quote.
 * Only fields the traveller is entitled to see cross this boundary — commission,
 * merchant earnings and the ledger stay on the platform side.
 */
function toQuote(
  listing: Listing,
  quote: CheckoutQuote,
  quotedAt: string,
  source: string,
): AIBookingQuote {
  const m: BookingMoney = quote.money;
  const lines: AIPriceLine[] = [];

  const perNight = isPerNight(listing.vertical);
  lines.push({
    kind: "base",
    label: perNight
      ? `${quote.stay.roomTypeName} · ${quote.nights} night${quote.nights === 1 ? "" : "s"}`
      : quote.stay.roomTypeName,
    detail: quote.stay.ratePlanName,
    amountUsd: quote.stay.roomSubtotal,
  });
  for (const addOn of quote.addOns) {
    lines.push({ kind: "addon", label: addOn.label, amountUsd: addOn.total });
  }
  for (const discount of quote.discounts) {
    lines.push({ kind: "discount", label: discount.label, amountUsd: -discount.amount });
  }
  if (m.fees > 0) lines.push({ kind: "fee", label: "Service fee", amountUsd: m.fees });
  if (m.taxes > 0) lines.push({ kind: "tax", label: "Taxes", amountUsd: m.taxes });
  if (quote.insurance) {
    lines.push({
      kind: "insurance",
      label: quote.insurance.plan.name,
      amountUsd: quote.insurance.premium,
    });
  }

  const policy = getCancellationPolicy(quote.cancellationPolicyId);

  return {
    roomTypeId: quote.stay.roomTypeId,
    roomTypeName: quote.stay.roomTypeName,
    ratePlanId: quote.stay.ratePlanId,
    ratePlanName: quote.stay.ratePlanName,
    lines,
    subtotalUsd: quote.stay.roomSubtotal + quote.addOnTotal,
    discountUsd: m.discount,
    feesUsd: m.fees,
    taxesUsd: m.taxes,
    totalUsd: m.total,
    perNightUsd: perNight ? quote.stay.averageNightly : undefined,
    cancellationPolicy: policy.summary,
    refundable: quote.refundable,
    unitsLeft: quote.stay.unitsLeft,
    restrictions: quote.stay.blockers.map((b) => b.message),
    quotedAt,
    source,
  };
}

/** A domain booking as the assistant reports it. */
function toRecord(booking: Booking): AIBookingRecord {
  const policy = getCancellationPolicy(booking.cancellationPolicyId);
  return {
    id: booking.id,
    reference: booking.reference,
    title: booking.productTitle,
    status: booking.status,
    startDate: booking.startAt.slice(0, 10),
    endDate: booking.endAt.slice(0, 10),
    location: booking.destination,
    guests: booking.stay?.guests ?? booking.travelers.length,
    totalUsd: booking.money.total,
    cancellationPolicy: policy.summary,
    href: `/account/bookings/${booking.id}`,
    image: booking.listing?.image,
    kind: "stay",
  };
}

export class MockBookingRepository implements BookingRepository {
  readonly id = "mock-bookings";

  constructor(
    private readonly listings: ListingRepository,
    private readonly payments: PaymentRepository,
  ) {}

  /* ---------------------------------------------------------------------- */
  /* Availability + pricing                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * The room and rate to quote when the traveller hasn't chosen one.
   *
   * Deliberately the *same* rule the room picker and checkout use — first
   * available in room/plan order — rather than the cheapest bookable
   * combination. Two reasons: the assistant's price then matches what the
   * traveller sees if they open the listing, and quoting the cheapest would
   * quietly put people on a non-refundable rate they never asked for. Somebody
   * who wants the cheapest can ask for it.
   */
  async defaultRoomAndRate(input: Omit<BookingQuoteInput, "roomTypeId" | "ratePlanId">) {
    const listing = await this.listings.getBySlug(input.vertical, input.slug);
    if (!listing) return null;
    const property = toPropertyRef(listing);

    for (const room of getRoomTypes(property)) {
      // Property id deliberately omitted, matching the room picker: the two
      // must offer the same plans in the same order or the assistant's default
      // and the page's default would drift apart.
      for (const plan of ratePlansFor(listing.vertical)) {
        const quote = quoteStay({
          property,
          roomTypeId: room.id,
          ratePlanId: plan.id,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          units: input.units,
          guests: input.guests,
          bookingDate: input.bookingDate,
        });
        if (quote.available) {
          return {
            roomTypeId: quote.roomTypeId,
            roomTypeName: quote.roomTypeName,
            ratePlanId: quote.ratePlanId,
            ratePlanName: quote.ratePlanName,
          };
        }
      }
    }

    // Nothing is bookable as-is. Return the cheapest *combination* anyway —
    // unavailable, but priced and carrying the engine's real blockers, so the
    // answer can be "that room sleeps two, you'd need a second one" instead of
    // an unhelpful "nothing is available".
    const fallback =
      cheapestQuote(property, input.checkIn, input.checkOut, input.units, input.guests, input.bookingDate) ??
      firstQuotable(property, input);
    if (!fallback) return null;
    return {
      roomTypeId: fallback.roomTypeId,
      roomTypeName: fallback.roomTypeName,
      ratePlanId: fallback.ratePlanId,
      ratePlanName: fallback.ratePlanName,
    };
  }

  /**
   * Availability *and* price in one pass.
   *
   * The status is derived, not guessed: sold-out and stop-sell mean the item is
   * gone; a stay rule (minimum nights, closed to arrival, occupancy) is a
   * restriction the traveller can act on, and the difference matters because
   * one deserves alternatives and the other deserves a nudge.
   */
  async checkAvailability(input: BookingQuoteInput): Promise<AIAvailabilityResult> {
    const listing = await this.listings.getBySlug(input.vertical, input.slug);
    if (!listing) {
      return {
        status: "no_longer_available",
        available: false,
        unitsLeft: 0,
        blockers: [{ code: "unknown_listing", message: "That listing is no longer published." }],
      };
    }

    const choice =
      input.roomTypeId && input.ratePlanId
        ? { roomTypeId: input.roomTypeId, ratePlanId: input.ratePlanId }
        : await this.defaultRoomAndRate(input);

    if (!choice) {
      return {
        status: "no_longer_available",
        available: false,
        unitsLeft: 0,
        blockers: [
          { code: "sold_out", message: "Nothing is bookable at this property on those dates." },
        ],
      };
    }

    const selection = this.toSelection(listing, { ...input, ...choice });
    const quote = quoteCheckout(selection);
    const priced = toQuote(listing, quote, `${input.bookingDate}T00:00:00.000Z`, "checkAvailability");

    const hard = quote.blockers.some((b) => b.code === "sold_out" || b.code === "stop_sell");
    const status = quote.available
      ? "available"
      : hard
        ? "no_longer_available"
        : "booking_restriction";

    return {
      status,
      available: quote.available,
      unitsLeft: quote.stay.unitsLeft,
      blockers: quote.blockers.map((b) => ({ code: b.code, message: b.message })),
      quote: priced,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Confirmation                                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * Create the booking.
   *
   * Deliberately re-prices first and refuses to proceed if the total moved: the
   * traveller confirmed a *number*, and charging a different one — even a lower
   * one — is not what they agreed to. The agent turns that refusal into a price
   * change block and asks again.
   */
  async confirm(input: BookingConfirmInput): Promise<BookingConfirmResult> {
    const { quoteInput } = input;
    const listing = await this.listings.getBySlug(quoteInput.vertical, quoteInput.slug);
    if (!listing) {
      return { ok: false, code: "booking_failed", message: "That listing is no longer published." };
    }

    const selection = this.toSelection(listing, quoteInput);
    const quote = quoteCheckout(selection);

    if (!quote.available) {
      const hard = quote.blockers.some((b) => b.code === "sold_out" || b.code === "stop_sell");
      return {
        ok: false,
        code: hard ? "availability_lost" : "booking_failed",
        message: quote.blockers[0]?.message ?? "Those dates are no longer bookable.",
        details: quote.blockers.map((b) => b.message),
      };
    }

    if (Math.round(quote.money.total) !== Math.round(input.agreedTotalUsd)) {
      return {
        ok: false,
        code: "price_changed",
        message: "The price changed since you were quoted.",
        currentTotalUsd: quote.money.total,
      };
    }

    // --- hold ------------------------------------------------------------
    const held = createHold(selection, quote);
    if (!held.ok) {
      return {
        ok: false,
        code: "availability_lost",
        message: held.message,
        details: held.blockers.map((b) => b.message),
      };
    }

    // --- payment ---------------------------------------------------------
    const payment = await this.payments.authorize({
      intentId: held.hold.id,
      amountUsd: quote.money.total,
      methodId: input.payment.methodId,
    });

    if (payment.status !== "captured") {
      abandonHold(held.hold.id);
      return {
        ok: false,
        code: "payment_failed",
        message:
          payment.status === "requires_authentication"
            ? "Your bank asked to verify this payment, which I can't complete inside the chat."
            : (payment.message ?? "The payment was declined."),
      };
    }

    // --- create the booking ----------------------------------------------
    const attempt = latestAttempt(held.hold.id);
    try {
      const booking = await confirmBooking({
        selection,
        quote,
        hold: held.hold,
        attempt,
        customer: {
          name: input.contact.fullName,
          email: input.contact.email,
          phone: input.contact.phone,
        },
        travelers: input.travelers.map((t) => ({
          fullName: t.fullName,
          type: t.type,
          email: t.email,
          phone: t.phone,
          nationality: t.nationality,
          passportNumber: t.passportNumber,
        })),
        specialRequests: input.specialRequests,
        actor: { id: "ai_concierge", name: "Travel assistant", role: "customer" },
      });
      return { ok: true, record: toRecord(booking) };
    } catch (error) {
      releaseHold(held.hold.id);
      return {
        ok: false,
        code: "booking_failed",
        message:
          error instanceof Error && error.message
            ? error.message
            : "The booking couldn't be created.",
      };
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Reading bookings                                                        */
  /* ---------------------------------------------------------------------- */

  async get(idOrReference: string, customerEmail?: string): Promise<AIBookingRecord | undefined> {
    const booking = findBooking(idOrReference, customerEmail);
    return booking ? toRecord(booking) : undefined;
  }

  /** The traveller's own bookings, newest first. Never anybody else's. */
  async list(customerEmail?: string): Promise<AIBookingRecord[]> {
    if (!customerEmail) return [];
    const needle = customerEmail.toLowerCase();
    return getState()
      .bookings.filter((b) => b.customer.email.toLowerCase() === needle)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toRecord);
  }

  /* ---------------------------------------------------------------------- */
  /* Cancellation and modification                                           */
  /* ---------------------------------------------------------------------- */

  async quoteCancellation(
    idOrReference: string,
    customerEmail?: string,
  ): Promise<AICancellationQuote | undefined> {
    const booking = findBooking(idOrReference, customerEmail);
    if (!booking) return undefined;
    const refund = quoteRefund({ booking, reason: "customer_cancellation" });
    const policy = getCancellationPolicy(booking.cancellationPolicyId);
    return {
      bookingId: booking.id,
      reference: booking.reference,
      refundUsd: refund.refundAmount,
      feeUsd: refund.cancellationFee,
      policy: policy.summary,
      refundable: refund.eligible && refund.refundAmount > 0,
    };
  }

  async cancel(idOrReference: string, customerEmail?: string): Promise<BookingCancelResult> {
    const booking = findBooking(idOrReference, customerEmail);
    if (!booking) {
      return {
        ok: false,
        message: "I couldn't find that booking on this account.",
        href: "/account/bookings",
      };
    }
    const quote = await this.quoteCancellation(idOrReference, customerEmail);
    try {
      await bookingService.transition(booking.id, "cancel", {
        actor: { id: "ai_concierge", name: "Travel assistant", role: "customer" },
        refundReason: "customer_cancellation",
        note: "Cancelled by the traveller through the assistant.",
      });
      return { ok: true, quote: quote! };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : "That booking can't be cancelled from here.",
        href: `/account/bookings/${booking.id}`,
      };
    }
  }

  async quoteModification(
    idOrReference: string,
    patch: { checkIn?: string; checkOut?: string; guests?: number; units?: number },
  ) {
    const booking = findBooking(idOrReference);
    if (!booking?.listing || !booking.stay) {
      return {
        ok: false as const,
        message: "I can only re-price stays booked through Otithee. Open the booking to change it.",
      };
    }
    const vertical = booking.listing.vertical as ListingVertical;
    const listing = await this.listings.getBySlug(vertical, booking.listing.slug);
    if (!listing) {
      return { ok: false as const, message: "That listing is no longer published." };
    }

    const checkIn = patch.checkIn ?? booking.startAt.slice(0, 10);
    const checkOut = patch.checkOut ?? booking.endAt.slice(0, 10);
    const selection = this.toSelection(listing, {
      vertical,
      slug: booking.listing.slug,
      checkIn,
      checkOut,
      units: patch.units ?? booking.stay.units,
      guests: patch.guests ?? booking.stay.guests,
      roomTypeId: booking.stay.roomTypeId,
      ratePlanId: booking.stay.ratePlanId,
      customerEmail: booking.customer.email,
      bookingDate: checkIn,
    });
    const quote = quoteCheckout(selection);
    return {
      ok: true as const,
      currentTotalUsd: booking.money.total,
      newTotalUsd: quote.money.total,
      available: quote.available,
      message: quote.available
        ? getRatePlan(booking.stay.ratePlanId).refundable
          ? "These dates are available on your current rate."
          : "These dates are available, but your rate is non-refundable — changing it may cost the full stay."
        : (quote.blockers[0]?.message ?? "Those dates aren't available."),
    };
  }

  /* ---------------------------------------------------------------------- */

  /** Build the checkout selection the domain prices against. */
  private toSelection(listing: Listing, input: BookingQuoteInput): CheckoutSelection {
    const perNight = isPerNight(listing.vertical);
    return {
      listing,
      roomTypeId: input.roomTypeId ?? "",
      ratePlanId: (input.ratePlanId ?? "standard") as CheckoutSelection["ratePlanId"],
      checkIn: input.checkIn,
      checkOut: perNight ? input.checkOut : input.checkIn,
      units: Math.max(1, input.units),
      guests: Math.max(1, input.guests),
      addOns: [],
      customerEmail: input.customerEmail?.toLowerCase() || ANONYMOUS_EMAIL,
    };
  }
}

/**
 * The first room/plan the engine can price at all, available or not.
 *
 * Used only when nothing is bookable: its blockers are what the traveller
 * actually needs ("this room sleeps 2", "3-night minimum"), and a quote nobody
 * can buy is still more useful than no explanation.
 */
function firstQuotable(
  property: ReturnType<typeof toPropertyRef>,
  input: Omit<BookingQuoteInput, "roomTypeId" | "ratePlanId">,
) {
  const room = getRoomTypes(property)[0];
  const plan = ratePlansFor(property.vertical)[0];
  if (!room || !plan) return null;
  return quoteStay({
    property,
    roomTypeId: room.id,
    ratePlanId: plan.id,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    units: input.units,
    guests: input.guests,
    bookingDate: input.bookingDate,
  });
}

/** Newest payment attempt against an intent, for linking to the booking. */
function latestAttempt(intentId: string): PaymentAttempt | null {
  const attempts = attemptsForIntent(intentId);
  return attempts.length ? attempts[attempts.length - 1] : null;
}

/**
 * Find a booking by id or by human reference, case-insensitively — and only
 * within the asking traveller's own bookings.
 */
function findBooking(idOrReference: string, customerEmail?: string): Booking | undefined {
  const needle = idOrReference.trim().toLowerCase();
  const owner = customerEmail?.toLowerCase();
  return getState().bookings.find(
    (b) =>
      (b.id.toLowerCase() === needle || b.reference.toLowerCase() === needle) &&
      (!owner || b.customer.email.toLowerCase() === owner),
  );
}
