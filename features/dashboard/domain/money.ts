/**
 * The platform's money engine — commission, taxes, fees, discounts, B2B markup,
 * refund quotes and settlement roll-ups.
 *
 * Every monetary figure shown anywhere in the product comes from here. Nothing
 * recomputes a commission inline: components read {@link BookingMoney} off the
 * booking, and any new booking (dashboard, checkout, combo, B2B) is priced by
 * {@link priceBooking}. Replacing these bodies with server-calculated numbers is
 * the only change a real backend needs.
 *
 * Canonical formula
 * -----------------
 *   netSale         = base + markup − discount
 *   taxes           = netSale × taxRate
 *   fees            = netSale × platformFeeRate
 *   customerTotal   = netSale + taxes + fees
 *   commission      = netSale × commissionRate
 *   merchantEarning = netSale − commission
 *   platformRevenue = commission + fees
 *   netSettlement   = merchantEarning − refundAdjustment
 */

import { getCancellationPolicy } from "./lifecycle";
import type {
  AppliedDiscount,
  Booking,
  BookingMoney,
  BookingSegment,
  CancellationPolicyId,
  ComboOffer,
  CustomerEligibility,
  Offer,
  OfferEvaluation,
  ProductKind,
  RefundKind,
  RefundQuote,
  RefundReason,
  Settlement,
} from "./types";

/** Platform pricing constants. A real deployment reads these from settings. */
export const PRICING_CONFIG = {
  currency: "USD",
  /** Tax applied to the net sale. */
  taxRate: 0.075,
  /** Platform service fee charged to the customer. */
  platformFeeRate: 0.02,
  /** Fallback commission when a merchant has no negotiated rate. */
  defaultCommissionRate: 12,
  /** Commission rates per product kind, percent. */
  commissionByProduct: {
    hotels: 12,
    apartments: 14,
    resorts: 13,
    "shared-rooms": 10,
    "convention-hall": 9,
    flights: 5,
    transport: 15,
    tours: 18,
    activities: 18,
    visa: 8,
    combo: 15,
  } as Record<ProductKind, number>,
} as const;

/** Round to cents so totals never drift by floating-point dust. */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Commission rate for a product, honouring a merchant's negotiated override. */
export function commissionRateFor(
  productKind: ProductKind,
  merchantRate?: number,
): number {
  if (typeof merchantRate === "number" && merchantRate > 0) return merchantRate;
  return (
    PRICING_CONFIG.commissionByProduct[productKind] ??
    PRICING_CONFIG.defaultCommissionRate
  );
}

export interface PriceBookingInput {
  base: number;
  /** Agency/corporate markup — B2B only. */
  markup?: number;
  discount?: number;
  commissionRate: number;
  currency?: string;
  taxRate?: number;
  platformFeeRate?: number;
  /** Already-refunded amount, when re-pricing an existing booking. */
  refunded?: number;
  commissionReversed?: number;
}

/**
 * Price a booking end-to-end. The one function that turns a base amount into
 * the full customer/platform/merchant split.
 */
export function priceBooking({
  base,
  markup = 0,
  discount = 0,
  commissionRate,
  currency = PRICING_CONFIG.currency,
  taxRate = PRICING_CONFIG.taxRate,
  platformFeeRate = PRICING_CONFIG.platformFeeRate,
  refunded = 0,
  commissionReversed = 0,
}: PriceBookingInput): BookingMoney {
  const netSale = money(Math.max(0, base + markup - discount));
  const taxes = money(netSale * taxRate);
  const fees = money(netSale * platformFeeRate);
  const total = money(netSale + taxes + fees);
  const commission = money(netSale * (commissionRate / 100));
  const merchantEarning = money(netSale - commission);
  const platformRevenue = money(commission + fees);
  const netSettlement = money(
    merchantEarning - Math.max(0, refunded - commissionReversed),
  );

  return {
    currency,
    base: money(base),
    markup: money(markup),
    discount: money(discount),
    netSale,
    taxes,
    fees,
    total,
    commissionRate,
    commission,
    merchantEarning,
    platformRevenue,
    refunded: money(refunded),
    commissionReversed: money(commissionReversed),
    netSettlement,
  };
}

/** Re-price a booking after a refund, keeping every derived figure consistent. */
export function applyRefundToMoney(
  current: BookingMoney,
  refundAmount: number,
  commissionReversed: number,
): BookingMoney {
  return priceBooking({
    base: current.base,
    markup: current.markup,
    discount: current.discount,
    commissionRate: current.commissionRate,
    currency: current.currency,
    taxRate: current.taxes / (current.netSale || 1),
    platformFeeRate: current.fees / (current.netSale || 1),
    refunded: current.refunded + refundAmount,
    commissionReversed: current.commissionReversed + commissionReversed,
  });
}

// ---------------------------------------------------------------------------
// B2B pricing
// ---------------------------------------------------------------------------

export interface B2BPricingInput {
  /** Public (B2C) rate for the same product. */
  publicRate: number;
  /** Net-rate discount the platform grants the account, percent. */
  netRateDiscount: number;
  /** Markup the agency adds when reselling, percent. */
  markupRate: number;
}

export interface B2BPricing {
  publicRate: number;
  /** What the agency is charged before markup. */
  netRate: number;
  /** The agency's gross margin. */
  markup: number;
  /** What the agency's own customer pays. */
  sellRate: number;
  /** Saving versus booking at the public rate. */
  agencySaving: number;
}

/**
 * B2B rate build-up. Agencies buy at a net rate (public rate less their
 * negotiated discount) and resell at net + markup; the platform still earns
 * commission on the net rate.
 */
export function priceB2B({
  publicRate,
  netRateDiscount,
  markupRate,
}: B2BPricingInput): B2BPricing {
  const netRate = money(publicRate * (1 - netRateDiscount / 100));
  const markup = money(netRate * (markupRate / 100));
  return {
    publicRate: money(publicRate),
    netRate,
    markup,
    sellRate: money(netRate + markup),
    agencySaving: money(publicRate - netRate),
  };
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export interface OfferContext {
  /** Amount the discount is measured against (base + markup). */
  amount: number;
  productKind: ProductKind;
  destination?: string;
  segment: BookingSegment;
  /** Is this the customer's first booking? */
  isNewCustomer?: boolean;
  isMember?: boolean;
  /** How many times this customer already used the offer. */
  userUsage?: number;
  /** Evaluation date (ISO). Defaults to {@link PLATFORM_NOW}. */
  at?: string;
}

/** Fixed "now" for deterministic SSR — the domain's clock. */
export const PLATFORM_NOW = "2026-08-11T09:00:00.000Z";

function eligibilityMatches(
  eligibility: CustomerEligibility,
  ctx: OfferContext,
): boolean {
  switch (eligibility) {
    case "all":
      return true;
    case "new":
      return Boolean(ctx.isNewCustomer);
    case "returning":
      return !ctx.isNewCustomer;
    case "member":
      return Boolean(ctx.isMember);
    case "b2b":
      return ctx.segment === "b2b";
    default:
      return true;
  }
}

/**
 * Evaluate an offer against a prospective booking. Returns the discount and,
 * when it doesn't apply, the reason — which the UI shows verbatim so a customer
 * always learns *why* a code was rejected.
 */
export function evaluateOffer(offer: Offer, ctx: OfferContext): OfferEvaluation {
  const now = new Date(ctx.at ?? PLATFORM_NOW).getTime();

  if (offer.status !== "active") {
    return { applicable: false, discount: 0, reason: `Offer is ${offer.status}.` };
  }
  if (now < new Date(offer.startAt).getTime()) {
    return { applicable: false, discount: 0, reason: "Offer hasn't started yet." };
  }
  if (now > new Date(offer.endAt).getTime()) {
    return { applicable: false, discount: 0, reason: "Offer has expired." };
  }
  if (offer.usageLimit > 0 && offer.used >= offer.usageLimit) {
    return { applicable: false, discount: 0, reason: "Offer usage limit reached." };
  }
  if (offer.perUserLimit > 0 && (ctx.userUsage ?? 0) >= offer.perUserLimit) {
    return {
      applicable: false,
      discount: 0,
      reason: `Limited to ${offer.perUserLimit} use${offer.perUserLimit > 1 ? "s" : ""} per customer.`,
    };
  }
  if (ctx.amount < offer.minBookingAmount) {
    return {
      applicable: false,
      discount: 0,
      reason: `Minimum booking amount is ${offer.minBookingAmount.toFixed(0)}.`,
    };
  }
  if (offer.products.length > 0 && !offer.products.includes(ctx.productKind)) {
    return { applicable: false, discount: 0, reason: "Not valid for this product." };
  }
  if (
    offer.destinations.length > 0 &&
    ctx.destination &&
    !offer.destinations.includes(ctx.destination)
  ) {
    return { applicable: false, discount: 0, reason: "Not valid for this destination." };
  }
  if (!eligibilityMatches(offer.eligibility, ctx)) {
    return { applicable: false, discount: 0, reason: "You're not eligible for this offer." };
  }

  const raw =
    offer.discountType === "percent"
      ? ctx.amount * (offer.value / 100)
      : offer.value;
  const capped = offer.maxDiscount > 0 ? Math.min(raw, offer.maxDiscount) : raw;
  return { applicable: true, discount: money(Math.min(capped, ctx.amount)) };
}

/** Turn a successful evaluation into a booking discount line. */
export function offerToDiscount(offer: Offer, discount: number): AppliedDiscount {
  return {
    kind: offer.promoCode ? "coupon" : "offer",
    ref: offer.promoCode ?? offer.id,
    label: offer.name,
    amount: money(discount),
  };
}

// ---------------------------------------------------------------------------
// Combo offers
// ---------------------------------------------------------------------------

export interface ComboTotals {
  /** Sum of the items' standalone prices. */
  individualTotal: number;
  comboPrice: number;
  savings: number;
  savingsPercent: number;
  /** Per-item share of the combo price, pro-rata by standalone price. */
  allocation: { itemId: string; title: string; price: number; allocated: number }[];
  available: number;
  soldOut: boolean;
}

/**
 * Combo economics. The bundle discount is allocated back to each item pro-rata,
 * which is what makes per-merchant commission and partial refunds possible on a
 * multi-merchant bundle.
 */
export function comboTotals(combo: ComboOffer): ComboTotals {
  const individualTotal = money(
    combo.items.reduce((sum, item) => sum + item.price, 0),
  );
  const savings = money(Math.max(0, individualTotal - combo.comboPrice));
  const ratio = individualTotal > 0 ? combo.comboPrice / individualTotal : 0;
  return {
    individualTotal,
    comboPrice: money(combo.comboPrice),
    savings,
    savingsPercent: individualTotal > 0 ? money((savings / individualTotal) * 100) : 0,
    allocation: combo.items.map((item) => ({
      itemId: item.id,
      title: item.title,
      price: money(item.price),
      allocated: money(item.price * ratio),
    })),
    available: Math.max(0, combo.inventory - combo.sold),
    soldOut: combo.sold >= combo.inventory,
  };
}

/** Is the combo bookable right now (window, status, inventory)? */
export function comboAvailability(
  combo: ComboOffer,
  at: string = PLATFORM_NOW,
): { bookable: boolean; reason?: string } {
  const now = new Date(at).getTime();
  if (combo.status !== "active") return { bookable: false, reason: `Combo is ${combo.status}.` };
  if (now < new Date(combo.validFrom).getTime()) {
    return { bookable: false, reason: "Not yet on sale." };
  }
  if (now > new Date(combo.validTo).getTime()) {
    return { bookable: false, reason: "Validity has passed." };
  }
  if (combo.sold >= combo.inventory) return { bookable: false, reason: "Sold out." };
  return { bookable: true };
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

/** Reasons that always refund in full, regardless of the policy. */
const PLATFORM_FAULT_REASONS: readonly RefundReason[] = [
  "booking_failed",
  "payment_captured_booking_failed",
  "merchant_cancellation",
  "duplicate_booking",
  "overcharge",
];

export interface RefundQuoteInput {
  booking: Pick<Booking, "money" | "cancellationPolicyId" | "startAt" | "status">;
  reason: RefundReason;
  /** Evaluation time (ISO). Defaults to {@link PLATFORM_NOW}. */
  at?: string;
  /** Override the refunded share (0–1) — used for goodwill/partial refunds. */
  overridePercent?: number;
}

/**
 * Quote a refund without persisting anything: eligibility, the matched policy
 * tier, the cancellation fee, the tax adjustment and the final amount, plus the
 * display lines the UI renders. Called by the customer cancellation dialog, the
 * merchant view and the admin refund console — so all three always agree.
 */
export function quoteRefund({
  booking,
  reason,
  at = PLATFORM_NOW,
  overridePercent,
}: RefundQuoteInput): RefundQuote {
  const policy = getCancellationPolicy(booking.cancellationPolicyId);
  const { money: m } = booking;
  const hoursUntilStart = Math.max(
    0,
    (new Date(booking.startAt).getTime() - new Date(at).getTime()) / 3_600_000,
  );

  const platformFault = PLATFORM_FAULT_REASONS.includes(reason);
  const tier = platformFault
    ? null
    : (policy.tiers.find((t) => hoursUntilStart >= t.hoursBefore) ??
      policy.tiers[policy.tiers.length - 1]);

  const refundPercent =
    overridePercent ?? (platformFault ? 1 : (tier?.refundPercent ?? 0));
  const feePercent = platformFault ? 0 : (tier?.feePercent ?? 0);

  const refundableNet = money(m.netSale * refundPercent);
  const cancellationFee = money(m.netSale * feePercent);
  // Taxes and platform fees follow the refunded share of the sale.
  const taxAdjustment = money((m.taxes + m.fees) * refundPercent);
  const refundAmount = money(Math.max(0, refundableNet + taxAdjustment));
  const commissionReversed = money(m.commission * refundPercent);
  const merchantDeduction = money(refundableNet - commissionReversed);

  const alreadyRefunded = m.refunded > 0;
  const eligible = refundAmount > 0 && !alreadyRefunded;
  const kind: RefundKind =
    refundAmount <= 0 ? "none" : refundPercent >= 1 ? "full" : "partial";

  const lines: RefundQuote["lines"] = [
    { label: "Booking total", amount: m.total },
    { label: `Refundable (${Math.round(refundPercent * 100)}% of net sale)`, amount: refundableNet, tone: "positive" },
    { label: "Tax & fee adjustment", amount: taxAdjustment, tone: "positive" },
  ];
  if (cancellationFee > 0) {
    lines.push({ label: "Cancellation fee", amount: cancellationFee, tone: "negative" });
  }

  let quoteReason: string | undefined;
  if (alreadyRefunded) quoteReason = "This booking has already been refunded.";
  else if (refundAmount <= 0) {
    quoteReason =
      booking.cancellationPolicyId === "non_refundable"
        ? "This rate is non-refundable."
        : `No refund is due under the ${policy.label} policy this close to the start date.`;
  }

  return {
    eligible,
    kind,
    policy,
    tier,
    hoursUntilStart: Math.round(hoursUntilStart),
    currency: m.currency,
    originalAmount: m.total,
    refundPercent,
    cancellationFee,
    taxAdjustment,
    refundAmount,
    commissionReversed,
    merchantDeduction,
    reason: quoteReason,
    lines,
  };
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export interface SettlementTotals {
  bookingCount: number;
  grossSales: number;
  discounts: number;
  commission: number;
  refundAdjustment: number;
  netPayable: number;
}

/**
 * Roll a set of bookings up into a settlement. Only revenue-bearing bookings
 * contribute earnings; refunds are deducted net of the commission we gave back.
 */
export function settlementTotals(bookings: Booking[]): SettlementTotals {
  return bookings.reduce<SettlementTotals>(
    (acc, b) => {
      acc.bookingCount += 1;
      acc.grossSales = money(acc.grossSales + b.money.base + b.money.markup);
      acc.discounts = money(acc.discounts + b.money.discount);
      acc.commission = money(acc.commission + b.money.commission - b.money.commissionReversed);
      acc.refundAdjustment = money(
        acc.refundAdjustment + Math.max(0, b.money.refunded - b.money.commissionReversed),
      );
      acc.netPayable = money(acc.netPayable + b.money.netSettlement);
      return acc;
    },
    {
      bookingCount: 0,
      grossSales: 0,
      discounts: 0,
      commission: 0,
      refundAdjustment: 0,
      netPayable: 0,
    },
  );
}

/** Merchant-facing financial summary — the numbers on the earnings page. */
export interface MerchantFinancials {
  currency: string;
  grossSales: number;
  discounts: number;
  netSales: number;
  commission: number;
  refunds: number;
  netEarnings: number;
  pendingSettlement: number;
  availableBalance: number;
  paidOut: number;
  onHold: number;
  bookingCount: number;
  averageOrderValue: number;
  effectiveCommissionRate: number;
}

/**
 * Merchant P&L for a set of bookings + settlements. Uses the same primitives as
 * the admin commission dashboard, so merchant and admin views can never
 * disagree about a number.
 */
export function merchantFinancials(
  bookings: Booking[],
  settlements: Settlement[],
  currency = PRICING_CONFIG.currency,
): MerchantFinancials {
  let grossSales = 0;
  let discounts = 0;
  let commission = 0;
  let refunds = 0;
  let netEarnings = 0;

  for (const b of bookings) {
    grossSales = money(grossSales + b.money.base + b.money.markup);
    discounts = money(discounts + b.money.discount);
    commission = money(commission + b.money.commission - b.money.commissionReversed);
    refunds = money(refunds + b.money.refunded);
    netEarnings = money(netEarnings + b.money.netSettlement);
  }

  const paidOut = money(
    settlements.filter((s) => s.status === "paid").reduce((n, s) => n + s.netPayable, 0),
  );
  const onHold = money(
    settlements.filter((s) => s.status === "on_hold").reduce((n, s) => n + s.netPayable, 0),
  );
  const pendingSettlement = money(
    settlements
      .filter((s) => s.status === "pending" || s.status === "scheduled" || s.status === "processing")
      .reduce((n, s) => n + s.netPayable, 0),
  );
  const netSales = money(grossSales - discounts);

  return {
    currency,
    grossSales,
    discounts,
    netSales,
    commission,
    refunds,
    netEarnings,
    pendingSettlement,
    availableBalance: money(Math.max(0, netEarnings - paidOut - pendingSettlement - onHold)),
    paidOut,
    onHold,
    bookingCount: bookings.length,
    averageOrderValue: bookings.length ? money(grossSales / bookings.length) : 0,
    effectiveCommissionRate: netSales > 0 ? money((commission / netSales) * 100) : 0,
  };
}

/** Platform-facing financial summary — the admin commission dashboard. */
export interface PlatformFinancials {
  currency: string;
  gmv: number;
  netSales: number;
  discounts: number;
  taxes: number;
  fees: number;
  commission: number;
  commissionReversed: number;
  platformRevenue: number;
  merchantEarnings: number;
  refunds: number;
  pendingSettlements: number;
  completedSettlements: number;
  bookingCount: number;
  failedCount: number;
  refundedCount: number;
  takeRate: number;
}

export function platformFinancials(
  bookings: Booking[],
  settlements: Settlement[],
  currency = PRICING_CONFIG.currency,
): PlatformFinancials {
  let gmv = 0;
  let netSales = 0;
  let discounts = 0;
  let taxes = 0;
  let fees = 0;
  let commission = 0;
  let commissionReversed = 0;
  let merchantEarnings = 0;
  let refunds = 0;
  let failedCount = 0;
  let refundedCount = 0;

  for (const b of bookings) {
    gmv = money(gmv + b.money.total);
    netSales = money(netSales + b.money.netSale);
    discounts = money(discounts + b.money.discount);
    taxes = money(taxes + b.money.taxes);
    fees = money(fees + b.money.fees);
    commission = money(commission + b.money.commission);
    commissionReversed = money(commissionReversed + b.money.commissionReversed);
    merchantEarnings = money(merchantEarnings + b.money.netSettlement);
    refunds = money(refunds + b.money.refunded);
    if (b.status === "failed") failedCount += 1;
    if (b.status === "refunded") refundedCount += 1;
  }

  const netCommission = money(commission - commissionReversed);
  return {
    currency,
    gmv,
    netSales,
    discounts,
    taxes,
    fees,
    commission: netCommission,
    commissionReversed,
    platformRevenue: money(netCommission + fees),
    merchantEarnings,
    refunds,
    pendingSettlements: money(
      settlements
        .filter((s) => s.status !== "paid")
        .reduce((n, s) => n + s.netPayable, 0),
    ),
    completedSettlements: money(
      settlements.filter((s) => s.status === "paid").reduce((n, s) => n + s.netPayable, 0),
    ),
    bookingCount: bookings.length,
    failedCount,
    refundedCount,
    takeRate: netSales > 0 ? money((netCommission / netSales) * 100) : 0,
  };
}

/** Group any priced records into `{ key, label, value }` buckets for charts. */
export function groupSum<T>(
  rows: T[],
  keyOf: (row: T) => string,
  valueOf: (row: T) => number,
  labelOf: (row: T) => string = keyOf,
): { key: string; label: string; value: number; count: number }[] {
  const map = new Map<string, { key: string; label: string; value: number; count: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = map.get(key);
    if (existing) {
      existing.value = money(existing.value + valueOf(row));
      existing.count += 1;
    } else {
      map.set(key, { key, label: labelOf(row), value: money(valueOf(row)), count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/** Cancellation-policy id for a product kind — used when seeding/creating. */
export function defaultPolicyFor(kind: ProductKind): CancellationPolicyId {
  if (kind === "flights") return "strict";
  if (kind === "visa") return "non_refundable";
  if (kind === "tours" || kind === "activities") return "moderate";
  return "flexible";
}
