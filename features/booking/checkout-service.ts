/**
 * Checkout service — search → quote → hold → pay → confirm.
 *
 * This is the seam a real backend replaces. It is the only place the customer
 * checkout talks to the business layer, and it never computes a price itself:
 * nightly rates come from the inventory engine, discounts from the offer/loyalty
 * engines, and the final split from `priceBooking`. A component can pass a total
 * it thinks is right and it will simply be ignored.
 *
 * Ordering matters and is deliberate:
 *   1. quote      — prices the selection, no side effects
 *   2. hold       — takes the units out of availability for 15 minutes
 *   3. authorize  — the mock gateway; may need a 3-D Secure step
 *   4. confirm    — creates the booking, commits the hold, sends the messages
 *
 * If payment fails the hold survives, so the traveller can retry without losing
 * their dates; if they abandon, the hold expires and the units come back.
 */

import type { Listing } from "@/types/catalog";
import type {
  AppliedDiscount,
  BookingAddOn,
  Booking,
  BookingMoney,
  CancellationPolicyId,
  DomainActor,
  InventoryHold,
  MockInstrument,
  PaymentAttempt,
  PaymentOutcome,
  RatePlanId,
  StayQuote,
} from "@/features/dashboard/domain";
import {
  DEMO_CUSTOMER_PHONE,
  HOLD_MINUTES,
  InventoryError,
  PRICING_CONFIG,
  authorize,
  benefitsFor,
  bookingService,
  complete3DS,
  couponService,
  evaluateOffer,
  getRatePlan,
  getState,
  holdInventory,
  insuranceService,
  isPerNight,
  linkAttemptToBooking,
  loyaltyService,
  messagingService,
  money,
  nightsBetween,
  priceBooking,
  quoteStay,
  releaseHold,
  requestSupplierConfirmation,
  resolveCommission,
  track,
} from "@/features/dashboard/domain";
import type {
  InsuranceQuote,
  MembershipBenefits,
  MembershipCode,
} from "@/features/dashboard/domain";
import { merchantForListing, toListingRef, toPropertyRef } from "./property";

export { HOLD_MINUTES };

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------

export interface CheckoutSelection {
  listing: Listing;
  roomTypeId: string;
  ratePlanId: RatePlanId;
  /** ISO `YYYY-MM-DD`. */
  checkIn: string;
  /** ISO `YYYY-MM-DD`, exclusive. Same as `checkIn` for single-date products. */
  checkOut: string;
  units: number;
  guests: number;
  addOns: BookingAddOn[];
  /** Platform promo code (an `Offer`) or a wallet coupon code. */
  promoCode?: string;
  pointsToRedeem?: number;
  customerEmail: string;
  /** Lead traveller's name, when known — used by recovery nudges. */
  customerName?: string;
  /** Demo insurance plan the traveller selected, if any. */
  insurancePlanId?: string;
}

export interface DiscountRejection {
  code: string;
  reason: string;
}

export interface CheckoutQuote {
  stay: StayQuote;
  addOns: BookingAddOn[];
  addOnTotal: number;
  /** Everything the discount engines granted. */
  discounts: AppliedDiscount[];
  /** Codes that were entered but couldn't be applied, with the reason. */
  rejected: DiscountRejection[];
  /** The authoritative money split. Components display this; never their own. */
  money: BookingMoney;
  /** Every insurance plan offerable for this trip, already priced. */
  insuranceOffers: InsuranceQuote[];
  /** The plan the traveller chose, if any. */
  insurance: InsuranceQuote | null;
  /** The traveller's membership benefits, applied above. */
  membership: MembershipBenefits & { code: MembershipCode; planName: string };
  /** Service fee the traveller would have paid without a membership. */
  feeWithoutMembership: number;
  cancellationPolicyId: CancellationPolicyId;
  refundable: boolean;
  /** Points this booking will earn once it completes. */
  pointsEarned: number;
  pointsRedeemed: number;
  maxPointsRedeemable: number;
  available: boolean;
  blockers: StayQuote["blockers"];
  nights: number;
}

/**
 * Price a checkout selection. Pure with respect to the store — it reads
 * availability and coupon state but writes nothing, so it is safe to call on
 * every keystroke.
 */
export function quoteCheckout(selection: CheckoutSelection): CheckoutQuote {
  const property = toPropertyRef(selection.listing);
  const merchant = merchantForListing(selection.listing);
  const plan = getRatePlan(selection.ratePlanId);

  const stay = quoteStay({
    property,
    roomTypeId: selection.roomTypeId,
    ratePlanId: selection.ratePlanId,
    checkIn: selection.checkIn,
    checkOut: selection.checkOut,
    units: selection.units,
    guests: selection.guests,
  });

  const addOnTotal = money(selection.addOns.reduce((sum, a) => sum + a.total, 0));
  const base = money(stay.roomSubtotal + addOnTotal);

  const discounts: AppliedDiscount[] = [];
  const rejected: DiscountRejection[] = [];

  // --- promo / wallet coupon ---------------------------------------------
  if (selection.promoCode?.trim()) {
    const code = selection.promoCode.trim().toUpperCase();
    const wallet = couponService.find(selection.customerEmail, code);
    if (wallet) {
      const evaluation = couponService.evaluate(wallet, {
        amount: base,
        productKind: selection.listing.vertical,
      });
      if (evaluation.applicable) {
        discounts.push(couponService.toDiscount(wallet, evaluation.discount));
      } else {
        rejected.push({ code, reason: evaluation.reason ?? "This code can't be used here." });
      }
    } else {
      const offer = getState().offers.find((o) => o.promoCode?.toUpperCase() === code);
      if (!offer) {
        rejected.push({ code, reason: "That code isn't valid." });
      } else {
        const evaluation = evaluateOffer(offer, {
          amount: base,
          productKind: selection.listing.vertical,
          destination: selection.listing.location.city ?? selection.listing.location.label,
          segment: "b2c",
          at: new Date().toISOString(),
        });
        if (evaluation.applicable) {
          discounts.push({
            kind: "coupon",
            ref: offer.promoCode ?? offer.id,
            label: offer.name,
            amount: evaluation.discount,
          });
        } else {
          rejected.push({ code, reason: evaluation.reason ?? "This code can't be used here." });
        }
      }
    }
  }

  // --- loyalty points -----------------------------------------------------
  const afterCoupon = money(base - discounts.reduce((s, d) => s + d.amount, 0));
  const maxPointsRedeemable = loyaltyService.maxRedeemable(selection.customerEmail, afterCoupon);
  let pointsRedeemed = 0;
  if (selection.pointsToRedeem && selection.pointsToRedeem > 0) {
    const line = loyaltyService.quoteRedemption(
      selection.customerEmail,
      selection.pointsToRedeem,
      afterCoupon,
    );
    if (line) {
      discounts.push(line);
      pointsRedeemed = Number(line.ref.split(":")[1] ?? 0);
    }
  }

  // --- membership ---------------------------------------------------------
  // A member discount is funded by the platform, not the merchant, so it is
  // tracked separately and comes out of platform revenue.
  const membership = benefitsFor(selection.customerEmail);
  let platformFundedDiscount = 0;
  if (membership.memberDiscountPercent > 0) {
    const raw = money(base * (membership.memberDiscountPercent / 100));
    platformFundedDiscount = money(
      membership.memberDiscountCap > 0
        ? Math.min(raw, membership.memberDiscountCap)
        : raw,
    );
    if (platformFundedDiscount > 0) {
      discounts.push({
        kind: "offer",
        ref: `membership:${membership.code}`,
        label: `${membership.planName} member discount`,
        amount: platformFundedDiscount,
      });
    }
  }

  const discountTotal = money(discounts.reduce((sum, d) => sum + d.amount, 0));
  const netSale = money(Math.max(0, base - Math.min(discountTotal, base)));

  // --- insurance ----------------------------------------------------------
  // Priced alongside the sale, never inside the commissionable base — the
  // premium is the provider's product, not the merchant's.
  const insuranceOffers = insuranceService.offers(selection.listing.vertical, {
    travelers: Math.max(1, selection.guests),
    tripValue: netSale,
    discountPercent: membership.insuranceDiscountPercent,
  });
  const insurance =
    insuranceOffers.find((offer) => offer.plan.id === selection.insurancePlanId) ?? null;

  // --- commission ----------------------------------------------------------
  const resolution = resolveCommission({
    productKind: selection.listing.vertical,
    merchantId: merchant.id,
    productId: selection.listing.id,
    ratePlanId: selection.ratePlanId,
    gross: base,
    // The platform-funded member discount doesn't reduce the commission base —
    // the merchant sold at full value and the platform paid the difference.
    net: money(netSale + platformFundedDiscount),
    merchantRate: merchant.commissionRate,
  });

  const feeWithoutMembership = money(netSale * PRICING_CONFIG.platformFeeRate);
  const priced = priceBooking({
    base,
    discount: Math.min(discountTotal, base),
    platformFundedDiscount,
    commissionRate: resolution.rate,
    commissionBasis: resolution.basis,
    commissionAmount: resolution.commission,
    commissionRuleId: resolution.ruleId,
    feeOverride: money(feeWithoutMembership * (1 - membership.serviceFeeWaiver)),
    insurance: insurance?.premium ?? 0,
    insuranceProviderShare: insurance?.providerShare ?? 0,
  });

  return {
    stay,
    addOns: selection.addOns,
    addOnTotal,
    discounts,
    rejected,
    money: priced,
    insuranceOffers,
    insurance,
    membership,
    feeWithoutMembership,
    cancellationPolicyId: plan.cancellationPolicyId,
    refundable: plan.refundable,
    pointsEarned: loyaltyService.previewEarn(selection.customerEmail, priced.netSale),
    pointsRedeemed,
    maxPointsRedeemable,
    available: stay.available,
    blockers: stay.blockers,
    nights: isPerNight(selection.listing.vertical)
      ? nightsBetween(selection.checkIn, selection.checkOut)
      : 1,
  };
}

// ---------------------------------------------------------------------------
// Hold
// ---------------------------------------------------------------------------

export type HoldResult =
  | { ok: true; hold: InventoryHold }
  | { ok: false; message: string; blockers: StayQuote["blockers"] };

/** Take the units out of availability while the traveller pays. */
export function createHold(selection: CheckoutSelection, quote: CheckoutQuote): HoldResult {
  try {
    const hold = holdInventory({
      property: toPropertyRef(selection.listing),
      roomTypeId: selection.roomTypeId,
      ratePlanId: selection.ratePlanId,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      units: selection.units,
      guests: selection.guests,
      lockedTotal: quote.money.total,
      // Carried so an abandoned checkout can be recovered with a link back to
      // exactly this room, rate and date range.
      intent: {
        customerEmail: selection.customerEmail,
        customerName: selection.customerName,
        listingSlug: selection.listing.slug,
        listingTitle: selection.listing.title,
        vertical: selection.listing.vertical,
      },
    });
    track("checkout_started", {
      listing: selection.listing.slug,
      vertical: selection.listing.vertical,
      total: quote.money.total,
      nights: quote.nights,
    });
    return { ok: true, hold };
  } catch (error) {
    if (error instanceof InventoryError) {
      return { ok: false, message: error.message, blockers: error.blockers };
    }
    throw error;
  }
}

export function abandonHold(holdId: string): void {
  releaseHold(holdId);
  track("checkout_abandoned", { holdId });
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export interface PaymentRequest {
  intentId: string;
  amount: number;
  instrument: MockInstrument;
  outcome: PaymentOutcome;
  holdId?: string;
  /** Deposit flows: the balance left to pay later. */
  balanceDue?: number;
  balanceDueAt?: string;
}

/** Run a payment attempt through the mock gateway. */
export function attemptPayment(request: PaymentRequest): PaymentAttempt {
  const attempt = authorize(request);
  track("payment_attempted", {
    outcome: attempt.status,
    amount: request.amount,
    attempt: attempt.attemptNumber,
  });
  return attempt;
}

export function submitAuthentication(attemptId: string, code: string) {
  return complete3DS(attemptId, code);
}

// ---------------------------------------------------------------------------
// Confirm
// ---------------------------------------------------------------------------

export interface ConfirmInput {
  selection: CheckoutSelection;
  quote: CheckoutQuote;
  hold: InventoryHold | null;
  attempt: PaymentAttempt | null;
  customer: { id?: string; name: string; email: string; phone?: string };
  travelers: { fullName: string; email?: string; phone?: string; passportNumber?: string; nationality?: string; type?: "adult" | "child" | "infant" }[];
  specialRequests?: string;
  /** Currency the traveller was quoted in, plus the rate used. */
  fx?: Booking["fx"];
  paymentPlan?: Booking["paymentPlan"];
  /** True for verticals that take an enquiry rather than a payment. */
  requestOnly?: boolean;
  actor?: DomainActor;
}

/**
 * Create the booking and drive it to its resting state.
 *
 * A paid booking walks `payment_pending → payment_processing → confirmed`, so
 * the timeline the operator sees is the same machine the dashboard drives — no
 * shortcut that would leave the audit trail with a hole in it.
 */
export async function confirmBooking(input: ConfirmInput): Promise<Booking> {
  const { selection, quote, hold, attempt } = input;
  const listing = selection.listing;
  const merchant = merchantForListing(listing);
  const plan = getRatePlan(selection.ratePlanId);
  const room = quote.stay;

  const actor: DomainActor = input.actor ?? {
    id: input.customer.id ?? "cus_web",
    name: input.customer.name,
    role: "customer",
  };

  const booking = await bookingService.create(
    {
      productKind: listing.vertical,
      productTitle: listing.title,
      destination: listing.location.city ?? listing.location.label,
      merchantId: merchant.id,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      segment: "b2c",
      startAt: new Date(`${selection.checkIn}T14:00:00.000Z`).toISOString(),
      endAt: new Date(
        `${selection.checkOut || selection.checkIn}T11:00:00.000Z`,
      ).toISOString(),
      quantity: selection.units,
      // The base excludes add-ons here: `create` adds them back, so passing the
      // room subtotal keeps a single definition of what an add-on costs.
      baseAmount: room.roomSubtotal,
      addOns: selection.addOns,
      channel: "web",
      discounts: quote.discounts,
      pointsRedeemed: quote.pointsRedeemed,
      cancellationPolicyId: plan.cancellationPolicyId,
      listing: toListingRef(listing),
      insurancePlanId: selection.insurancePlanId,
      holdId: hold?.id,
      fx: input.fx,
      paymentPlan: input.paymentPlan,
      specialRequests: input.specialRequests,
      stay: {
        roomTypeId: selection.roomTypeId,
        roomTypeName: room.roomTypeName,
        ratePlanId: plan.id,
        ratePlanName: plan.name,
        units: selection.units,
        guests: selection.guests,
        boardIncluded: plan.includesBreakfast,
        refundable: plan.refundable,
      },
      travelers: input.travelers.map((traveler, index) => ({
        id: `trv_${index}_${Date.now().toString(36)}`,
        fullName: traveler.fullName,
        type: traveler.type ?? "adult",
        email: traveler.email,
        phone: traveler.phone,
        nationality: traveler.nationality,
        passportNumber: traveler.passportNumber,
      })),
    },
    actor,
  );

  // Spend the wallet coupon only now that the booking exists.
  const walletLine = quote.discounts.find((d) => d.kind === "coupon");
  if (walletLine) {
    const wallet = couponService.find(input.customer.email, walletLine.ref);
    if (wallet) couponService.consume(wallet.id);
  }

  if (attempt) linkAttemptToBooking(attempt.id, booking.id);

  // Ask the supplier. Instant-confirmation products answer immediately with a
  // supplier reference; on-request ones (venue hire, visas, some tours) stay
  // pending until the merchant answers or the `supplier:confirm` job decides.
  const supplier = requestSupplierConfirmation(booking);

  // Enquiry-only products (visa, venue hire) stop at payment_pending: nothing
  // has been charged and the merchant confirms availability first.
  if (input.requestOnly) {
    track("booking_requested", { reference: booking.reference, vertical: listing.vertical });
    if (!supplier.instant) {
      messagingService.send({
        templateKey: "supplier_pending",
        to: { email: input.customer.email },
        customerEmail: input.customer.email,
        bookingId: booking.id,
        bookingRef: booking.reference,
        href: `/account/bookings/${booking.id}`,
        context: {
          name: input.customer.name.split(" ")[0],
          product: listing.title,
          reference: booking.reference,
        },
      });
    }
    return booking;
  }

  await bookingService.transition(booking.id, "capture_payment", {
    actor,
    note: attempt
      ? `${attempt.instrument.label} · ${attempt.reference}`
      : "Payment captured at checkout.",
  });
  const confirmed = await bookingService.transition(booking.id, "confirm", {
    actor,
    note: "Confirmed by the property.",
  });

  track("booking_confirmed", {
    reference: confirmed.booking.reference,
    vertical: listing.vertical,
    total: confirmed.booking.money.total,
    nights: quote.nights,
  });

  // The payment receipt is separate from the booking confirmation the
  // lifecycle already sent, so a customer gets both, as they would in reality.
  if (attempt) {
    messagingService.send({
      templateKey: "payment_received",
      to: { email: input.customer.email, phone: input.customer.phone ?? DEMO_CUSTOMER_PHONE },
      customerEmail: input.customer.email,
      bookingId: confirmed.booking.id,
      bookingRef: confirmed.booking.reference,
      href: `/account/bookings/${confirmed.booking.id}`,
      context: {
        reference: confirmed.booking.reference,
        total: `${attempt.currency} ${attempt.amount.toFixed(2)}`,
        instrument: attempt.instrument.label,
        txn: attempt.reference,
      },
    });
  }

  return confirmed.booking;
}

// ---------------------------------------------------------------------------
// Helpers for the UI
// ---------------------------------------------------------------------------

/** Verticals that take an enquiry rather than an immediate payment. */
export function isRequestVertical(vertical: Listing["vertical"]): boolean {
  return vertical === "visa" || vertical === "convention-hall";
}

/** Deposit split for pay-later: 25% now, the balance a week before arrival. */
export function depositPlan(total: number, checkIn: string): NonNullable<Booking["paymentPlan"]> {
  const deposit = money(Math.max(25, total * 0.25));
  const due = new Date(`${checkIn}T00:00:00.000Z`).getTime() - 7 * 86_400_000;
  return {
    kind: "deposit",
    depositAmount: deposit,
    balanceAmount: money(total - deposit),
    balanceDueAt: new Date(Math.max(due, Date.now() + 86_400_000)).toISOString(),
  };
}
