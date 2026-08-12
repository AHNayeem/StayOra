/**
 * Platform domain types — the normalized business model shared by every role
 * surface (admin, merchant, agency, customer).
 *
 * Nothing here imports React or Next: these are the shapes a real API would
 * return, so the domain services in this folder can be swapped for HTTP calls
 * without touching a single component. Money is stored in **USD** across the
 * whole domain so aggregates (GMV, commission, settlement) are always summable.
 */

import type { BookingVertical } from "@/types/booking";

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

/** Sales channel a booking came through. */
export type BookingChannel = "web" | "ios" | "android" | "agency" | "call_center";

/**
 * Which side of the business a booking belongs to.
 * `b2c` — a consumer pays the platform directly.
 * `b2b` — an agency/corporate account books on behalf of a traveler, on credit.
 */
export type BookingSegment = "b2c" | "b2b";

/** Products a booking can be made against (combo bundles several verticals). */
export type ProductKind = BookingVertical | "combo";

// ---------------------------------------------------------------------------
// Booking lifecycle
// ---------------------------------------------------------------------------

/**
 * The single booking lifecycle, shared by every vertical.
 *
 * `checked_in` is the stay/transport extension point: products that don't have
 * a check-in simply never enter it (see `LIFECYCLE_BY_KIND`). The refund states
 * live on the booking too, so "cancelled" and "refunded" are never conflated.
 */
export const BOOKING_STATUS_VALUES = [
  "initiated",
  "payment_pending",
  "payment_processing",
  "confirmed",
  "failed",
  "checked_in",
  "completed",
  "cancellation_requested",
  "cancelled",
  "refund_pending",
  "refund_processing",
  "refunded",
  "refund_failed",
] as const;

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];

/** Payment lifecycle — deliberately independent of {@link BookingStatus}. */
export const PAYMENT_STATUS_VALUES = [
  "pending",
  "processing",
  "authorized",
  "captured",
  "failed",
  "refund_pending",
  "partially_refunded",
  "refunded",
  "voided",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

/**
 * Why a booking failed. A failure is never a cancellation: the customer never
 * had a confirmed booking, and any captured payment must be refunded.
 */
export const BOOKING_FAILURE_REASONS = [
  "payment_failed",
  "payment_declined",
  "inventory_unavailable",
  "seat_unavailable",
  "room_unavailable",
  "provider_rejected",
  "timeout",
  "technical_error",
  "fraud_check",
] as const;

export type BookingFailureReason = (typeof BOOKING_FAILURE_REASONS)[number];

/** Cancellation policy identifiers (see `CANCELLATION_POLICIES`). */
export type CancellationPolicyId =
  | "flexible"
  | "moderate"
  | "strict"
  | "non_refundable";

/** One refund tier of a cancellation policy. */
export interface CancellationTier {
  /** Applies when the trip starts at least this many hours from now. */
  hoursBefore: number;
  /** Share of the net sale returned to the customer (0–1). */
  refundPercent: number;
  /** Cancellation fee as a share of the net sale (0–1). */
  feePercent: number;
}

export interface CancellationPolicy {
  id: CancellationPolicyId;
  label: string;
  summary: string;
  /** Ordered from the most generous window to the least. */
  tiers: CancellationTier[];
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/**
 * The money breakdown of a booking. Every figure is derived once by
 * {@link import("./money").priceBooking} — components never recompute them.
 */
export interface BookingMoney {
  currency: string;
  /** List price × quantity, before any adjustment. */
  base: number;
  /** Agency/corporate markup (B2B only; zero for B2C). */
  markup: number;
  /** Offer/coupon/combo discount applied at checkout. */
  discount: number;
  /** `base + markup - discount` — the amount commission is calculated on. */
  netSale: number;
  taxes: number;
  /** Platform service fee charged to the customer. */
  fees: number;
  /** What the customer (or agency) is invoiced. */
  total: number;
  /** Effective commission rate, percent (e.g. 12.5). */
  commissionRate: number;
  /** Platform commission on `netSale`. */
  commission: number;
  /** `netSale - commission` — what the merchant is owed. */
  merchantEarning: number;
  /** Commission + platform fees. */
  platformRevenue: number;
  /** Total refunded to the customer so far. */
  refunded: number;
  /** Commission reversed because of refunds. */
  commissionReversed: number;
  /** `merchantEarning - refund adjustment` — what actually settles. */
  netSettlement: number;
}

/** A discount line applied to a booking (offer, coupon or combo). */
export interface AppliedDiscount {
  kind: "offer" | "coupon" | "combo";
  /** Offer/combo id or coupon code. */
  ref: string;
  label: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

export interface MerchantRef {
  id: string;
  name: string;
  /** Default commission rate in percent. */
  commissionRate: number;
}

export interface CustomerRef {
  id: string;
  name: string;
  email: string;
  /** Set when the booking was made by an agency/corporate account. */
  organizationId?: string;
  organizationName?: string;
}

/** A person travelling on a booking. */
export interface Traveler {
  id: string;
  fullName: string;
  type: "adult" | "child" | "infant";
  email?: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
  /** Corporate traveler: the employee id / cost centre the trip is billed to. */
  employeeRef?: string;
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

/** One entry in a booking's audit/lifecycle timeline. */
export interface BookingEvent {
  id: string;
  at: string;
  /** Status the booking moved into, when the event was a transition. */
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  label: string;
  note?: string;
  /** Who caused it — "system" for automated transitions. */
  actor: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface Payment {
  id: string;
  reference: string;
  method: string;
  /** Card brand / wallet / "credit" for B2B invoices. */
  instrument: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** Set once the gateway captured the money. */
  capturedAt?: string;
  gatewayRef?: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface Booking {
  id: string;
  /** Human reference, e.g. "SO-24019". */
  reference: string;
  segment: BookingSegment;
  channel: BookingChannel;
  productKind: ProductKind;
  /** Product/listing title (or combo name). */
  productTitle: string;
  destination: string;
  /** Combo bookings carry the bundle id. */
  comboId?: string;
  /**
   * Booking group this booking belongs to, when it was created as part of a
   * unified trip. The group never owns a status of its own — each booking here
   * keeps its own lifecycle, which is what lets a trip be partially confirmed.
   */
  tripId?: string;
  /** Human trip reference, e.g. "TRIP-10021". */
  tripRef?: string;
  merchant: MerchantRef;
  customer: CustomerRef;
  travelers: Traveler[];
  /** Trip start (ISO). Visa: appointment date. Flight: departure. */
  startAt: string;
  /** Trip end (ISO). */
  endAt: string;
  nights: number;
  quantity: number;
  status: BookingStatus;
  /** Present only when `status` is `failed`. */
  failureReason?: BookingFailureReason;
  failureNote?: string;
  payment: Payment;
  money: BookingMoney;
  discounts: AppliedDiscount[];
  cancellationPolicyId: CancellationPolicyId;
  createdAt: string;
  updatedAt: string;
  timeline: BookingEvent[];
  /** Invoice number issued for this booking. */
  invoiceNumber: string;
  /** Refund ids raised against this booking. */
  refundIds: string[];
  /** Settlement batch this booking's earning belongs to. */
  settlementId?: string;
}

/** What a lifecycle transition produced — returned by `bookingService.transition`. */
export interface BookingActionResult {
  booking: Booking;
  /** Present when the transition created or advanced a refund. */
  refund?: Refund;
  from: BookingStatus;
  to: BookingStatus;
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export const REFUND_STATUS_VALUES = [
  "requested",
  "under_review",
  "approved",
  "rejected",
  "processing",
  "completed",
  "failed",
] as const;

export type RefundStatus = (typeof REFUND_STATUS_VALUES)[number];

/** How much of the booking a refund covers. */
export type RefundKind = "full" | "partial" | "none";

export type RefundReason =
  | "customer_cancellation"
  | "booking_failed"
  | "payment_captured_booking_failed"
  | "merchant_cancellation"
  | "duplicate_booking"
  | "service_not_as_described"
  | "overcharge"
  | "goodwill";

export interface Refund {
  id: string;
  reference: string;
  bookingId: string;
  bookingRef: string;
  customer: CustomerRef;
  merchant: MerchantRef;
  segment: BookingSegment;
  kind: RefundKind;
  reason: RefundReason;
  note?: string;
  status: RefundStatus;
  currency: string;
  /** Booking total the refund is measured against. */
  originalAmount: number;
  cancellationFee: number;
  taxAdjustment: number;
  /** What the customer receives. */
  refundAmount: number;
  /** Commission the platform gives back. */
  commissionReversed: number;
  /** What the merchant loses from settlement. */
  merchantDeduction: number;
  method: string;
  requestedAt: string;
  reviewedAt?: string;
  processedAt?: string;
  /** Who approved/rejected it. */
  decidedBy?: string;
  decisionNote?: string;
  /** Populated when `status` is `failed`. */
  failureMessage?: string;
}

/** Quote returned by the refund calculator before anything is persisted. */
export interface RefundQuote {
  eligible: boolean;
  kind: RefundKind;
  policy: CancellationPolicy;
  /** Which tier matched, for display. */
  tier: CancellationTier | null;
  hoursUntilStart: number;
  currency: string;
  originalAmount: number;
  refundPercent: number;
  cancellationFee: number;
  taxAdjustment: number;
  refundAmount: number;
  commissionReversed: number;
  merchantDeduction: number;
  /** Human-readable reason when `eligible` is false. */
  reason?: string;
  lines: { label: string; amount: number; tone?: "positive" | "negative" }[];
}

// ---------------------------------------------------------------------------
// Commission & settlement
// ---------------------------------------------------------------------------

export type CommissionStatus = "pending" | "settled" | "reversed" | "adjusted";

/** A commission ledger entry, one per booking. */
export interface CommissionEntry {
  id: string;
  reference: string;
  bookingId: string;
  bookingRef: string;
  merchantId: string;
  merchantName: string;
  productKind: ProductKind;
  segment: BookingSegment;
  currency: string;
  netSale: number;
  rate: number;
  commission: number;
  merchantEarning: number;
  reversed: number;
  status: CommissionStatus;
  createdAt: string;
  settlementId?: string;
}

export const SETTLEMENT_STATUS_VALUES = [
  "pending",
  "scheduled",
  "processing",
  "paid",
  "on_hold",
  "failed",
] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUS_VALUES)[number];

/** A payout batch: the merchant's earnings for one period, net of refunds. */
export interface Settlement {
  id: string;
  reference: string;
  merchantId: string;
  merchantName: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  bookingCount: number;
  grossSales: number;
  discounts: number;
  commission: number;
  refundAdjustment: number;
  /** `grossSales - discounts - commission - refundAdjustment`. */
  netPayable: number;
  status: SettlementStatus;
  method: string;
  scheduledFor: string;
  paidAt?: string;
  reference_note?: string;
  bookingIds: string[];
}

// ---------------------------------------------------------------------------
// Offers & combos
// ---------------------------------------------------------------------------

export type OfferScope = "platform" | "merchant";
export type OfferType = "promo_code" | "seasonal" | "flash" | "member" | "combo";
export type DiscountType = "percent" | "fixed";
export type OfferStatus = "draft" | "scheduled" | "active" | "paused" | "expired";
export type CustomerEligibility = "all" | "new" | "returning" | "member" | "b2b";

export interface Offer {
  id: string;
  name: string;
  description: string;
  scope: OfferScope;
  /** Owning merchant for `scope: "merchant"`. */
  merchantId?: string;
  merchantName?: string;
  offerType: OfferType;
  discountType: DiscountType;
  /** Percent (0–100) or a fixed USD amount, per `discountType`. */
  value: number;
  promoCode?: string;
  startAt: string;
  endAt: string;
  minBookingAmount: number;
  /** Cap on a percent discount (0 = uncapped). */
  maxDiscount: number;
  /** Products the offer applies to; empty = all. */
  products: ProductKind[];
  /** Destinations the offer applies to; empty = all. */
  destinations: string[];
  eligibility: CustomerEligibility;
  usageLimit: number;
  perUserLimit: number;
  used: number;
  status: OfferStatus;
  terms: string;
  createdAt: string;
}

/** One product inside a combo bundle. Items may span merchants. */
export interface ComboItem {
  id: string;
  kind: ProductKind;
  title: string;
  merchantId: string;
  merchantName: string;
  /** Standalone price, USD. */
  price: number;
  /** e.g. "3 nights", "Return flight", "Private transfer". */
  detail: string;
}

export interface ComboOffer {
  id: string;
  name: string;
  slug: string;
  description: string;
  destination: string;
  items: ComboItem[];
  /** Bundle price the customer pays for everything. */
  comboPrice: number;
  validFrom: string;
  validTo: string;
  /** Seats/packages available (prototype stand-in for real inventory). */
  inventory: number;
  sold: number;
  eligibility: CustomerEligibility;
  cancellationPolicyId: CancellationPolicyId;
  /** How refunds are split when only part of the bundle is cancelled. */
  refundHandling: "pro_rata" | "bundle_only" | "non_refundable";
  status: OfferStatus;
  terms: string;
  createdAt: string;
}

/** Result of applying an offer to a prospective booking. */
export interface OfferEvaluation {
  applicable: boolean;
  discount: number;
  /** Why it didn't apply, for the UI. */
  reason?: string;
}

// ---------------------------------------------------------------------------
// B2B
// ---------------------------------------------------------------------------

export type B2BAccountType = "travel_agency" | "corporate" | "tour_operator";
export type B2BAccountStatus = "pending" | "active" | "suspended" | "closed";
export type B2BSettlementTerm = "prepaid" | "net_7" | "net_15" | "net_30";

/** An agency or corporate client that books platform inventory. */
export interface B2BAccount {
  id: string;
  name: string;
  code: string;
  type: B2BAccountType;
  status: B2BAccountStatus;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Default markup the agency adds when reselling, percent. */
  defaultMarkupRate: number;
  /** Discount off public rates the platform grants this account, percent. */
  netRateDiscount: number;
  creditLimit: number;
  /** Outstanding invoiced-but-unpaid balance. */
  creditUsed: number;
  settlementTerm: B2BSettlementTerm;
  currency: string;
  /** Named travelers/employees the account books for. */
  seats: number;
  createdAt: string;
  ownerUserId?: string;
}

export type B2BInvoiceStatus = "draft" | "issued" | "part_paid" | "paid" | "overdue" | "void";

/** A consolidated invoice raised against a B2B account. */
export interface B2BInvoice {
  id: string;
  number: string;
  accountId: string;
  accountName: string;
  currency: string;
  issuedAt: string;
  dueAt: string;
  status: B2BInvoiceStatus;
  bookingIds: string[];
  /** Net (B2B) value of the bookings. */
  netAmount: number;
  markup: number;
  taxes: number;
  total: number;
  paid: number;
  balance: number;
}

// ---------------------------------------------------------------------------
// Notifications & audit
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | "booking"
  | "payment"
  | "refund"
  | "offer"
  | "settlement"
  | "commission"
  | "review"
  | "support"
  | "system";

/** Which role surfaces a notification is addressed to. */
export type NotificationAudience = "admin" | "merchant" | "customer" | "agency";

export interface PlatformNotification {
  id: string;
  category: NotificationCategory;
  audience: NotificationAudience[];
  title: string;
  body: string;
  /** Deep link into the relevant record. */
  href?: string;
  createdAt: string;
  read: boolean;
  tone: "neutral" | "success" | "warning" | "danger";
  /** Scope to one merchant/organization when relevant. */
  merchantId?: string;
  organizationId?: string;
  customerId?: string;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "cancel"
  | "refund"
  | "settle"
  | "status_change"
  | "login"
  | "export"
  | "suspend"
  | "activate";

export interface AuditLogEntry {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  /** Domain object type, e.g. "booking", "refund", "offer". */
  entity: string;
  entityId: string;
  entityLabel: string;
  summary: string;
  /** Before → after, for status changes. */
  from?: string;
  to?: string;
  ip?: string;
}

/** The actor performing a domain mutation (drives audit + notifications). */
export interface DomainActor {
  id: string;
  name: string;
  role: string;
  /** Merchant the actor belongs to, when they're a merchant user. */
  merchantId?: string;
  organizationId?: string;
}
