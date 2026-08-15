/**
 * Deterministic demo dataset.
 *
 * Everything a real API would serve is generated here from a fixed PRNG seed:
 * the same rows on the server and the client (no hydration drift), enough volume
 * to exercise pagination, charts, facets and reports, and — critically — one
 * source per fact. Refunds, commission entries, settlements and B2B invoices are
 * *derived from the bookings*, so every screen adds up to the same totals.
 */

import {
  CANCELLATION_POLICY_LIST,
  FAILURE_REASON_LABELS,
  hasCheckIn,
} from "./lifecycle";
import {
  PLATFORM_NOW,
  comboTotals,
  commissionRateFor,
  defaultPolicyFor,
  money,
  priceB2B,
  priceBooking,
  quoteRefund,
  settlementTotals,
} from "./money";
import type {
  AppliedDiscount,
  AuditLogEntry,
  B2BAccount,
  B2BInvoice,
  Booking,
  BookingChannel,
  BookingEvent,
  BookingFailureReason,
  BookingSegment,
  BookingStatus,
  ComboItem,
  ComboOffer,
  CommissionEntry,
  CustomerRef,
  MerchantRef,
  Offer,
  Payment,
  PaymentStatus,
  PlatformNotification,
  ProductKind,
  Refund,
  RefundReason,
  RefundStatus,
  Settlement,
  Traveler,
} from "./types";
import { canTrade, toMerchantRef } from "./merchants";
import { DEMO_MERCHANT_ID, MERCHANTS_SEED } from "./seed-merchants";

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, seeded PRNG. Same sequence everywhere. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOW_MS = new Date(PLATFORM_NOW).getTime();
const DAY = 86_400_000;

/** ISO timestamp `days` from the platform clock (negative = past). */
function iso(days: number, hour = 10): string {
  const d = new Date(NOW_MS + days * DAY);
  d.setUTCHours(hour, (Math.abs(days) * 7) % 60, 0, 0);
  return d.toISOString();
}

function pick<T>(list: readonly T[], r: () => number): T {
  return list[Math.floor(r() * list.length) % list.length];
}

function int(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

function pad(n: number, width = 5): string {
  return String(n).padStart(width, "0");
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

/**
 * The merchants a booking can be taken against — **derived** from the canonical
 * merchant records, never hand-maintained. Only merchants that can trade appear
 * here, so a pending application can never end up on a booking.
 */
export const MERCHANTS: MerchantRef[] = MERCHANTS_SEED.filter(canTrade).map(toMerchantRef);

export { DEMO_MERCHANT_ID };

const DESTINATIONS = [
  "Dubai",
  "Maldives",
  "Bangkok",
  "Istanbul",
  "Singapore",
  "London",
  "Cox's Bazar",
  "Kuala Lumpur",
  "Bali",
  "Doha",
];

const PRODUCTS: { kind: ProductKind; titles: string[]; merchants: string[] }[] = [
  {
    kind: "hotels",
    titles: ["Azure Bay Grand", "Highline Central Hotel", "Cedarwood Boutique", "Harbour Court Hotel"],
    merchants: ["mrc_azure", "mrc_highline", "mrc_cedar"],
  },
  {
    kind: "resorts",
    titles: ["Palm Grove Beach Resort", "Azure Lagoon Resort", "Coral Sands Retreat"],
    merchants: ["mrc_palm", "mrc_azure"],
  },
  {
    kind: "apartments",
    titles: ["Marina View Residences", "Skyline Serviced Apartment", "Old Town Loft"],
    merchants: ["mrc_marina", "mrc_cedar"],
  },
  {
    kind: "shared-rooms",
    titles: ["Sunset Shared Loft", "Backpacker Hub Dorm"],
    merchants: ["mrc_sunset"],
  },
  {
    kind: "convention-hall",
    titles: ["Grand Atrium Hall", "Highline Conference Centre"],
    merchants: ["mrc_highline"],
  },
  {
    kind: "tours",
    titles: ["Desert Safari with BBQ", "Old City Heritage Walk", "Island Hopping Day Tour"],
    merchants: ["mrc_desert", "mrc_sunset"],
  },
  {
    kind: "activities",
    titles: ["Sky Deck Observation", "Scuba Discovery Dive", "Hot Air Balloon Sunrise"],
    merchants: ["mrc_desert", "mrc_sunset"],
  },
  {
    kind: "transport",
    titles: ["Airport Private Transfer", "Intercity Luxury Coach", "Chauffeur Day Hire"],
    merchants: ["mrc_transit"],
  },
  {
    kind: "flights",
    titles: ["DAC → DXB Economy", "DXB → LHR Business", "SIN → BKK Economy"],
    merchants: ["mrc_skyfare"],
  },
  {
    kind: "visa",
    titles: ["UAE 30-day Tourist Visa", "Thailand e-Visa", "Schengen Short Stay"],
    merchants: ["mrc_visahub"],
  },
];

const CUSTOMER_NAMES = [
  "Liam Carter", "Noor Haddad", "Sofia Rossi", "Kenji Tanaka", "Amara Okafor",
  "Diego Morales", "Elena Petrova", "Yusuf Demir", "Mia Nguyen", "Omar Farouk",
  "Hana Kim", "Lucas Silva", "Fatima Zahra", "Arjun Mehta", "Zara Ahmed",
  "Tobias Lang", "Ingrid Larsen", "Ravi Kapoor", "Chloe Dubois", "Samuel Adeyemi",
  "Nadia Rahman", "Marco Bianchi", "Aisha Bello", "Peter Novak",
];

const CHANNELS: BookingChannel[] = ["web", "ios", "android", "agency", "call_center"];

const PAYMENT_METHODS = [
  { method: "Card", instrument: "Visa •••• 4242" },
  { method: "Card", instrument: "Mastercard •••• 5100" },
  { method: "Wallet", instrument: "Otithee Wallet" },
  { method: "Card", instrument: "Amex •••• 3007" },
  { method: "Bank transfer", instrument: "bKash" },
];

// ---------------------------------------------------------------------------
// B2B accounts
// ---------------------------------------------------------------------------

export const B2B_ACCOUNTS: B2BAccount[] = [
  {
    id: "org_globetrek",
    name: "GlobeTrek Travel Agency",
    code: "GTT-001",
    type: "travel_agency",
    status: "active",
    country: "BD",
    contactName: "Rezaul Karim",
    contactEmail: "ops@globetrek.example",
    contactPhone: "+880 1711 445566",
    defaultMarkupRate: 12,
    netRateDiscount: 8,
    commercialModel: "commission_plus_markup",
    agencyCommissionRate: 6,
    creditLimit: 50_000,
    creditUsed: 18_420,
    settlementTerm: "net_30",
    currency: "USD",
    seats: 14,
    tier: "enterprise",
    subscriptionFee: 249,
    subscriptionRenewsAt: iso(60),
    createdAt: iso(-420),
    ownerUserId: "usr_agency_demo",
  },
  {
    id: "org_northwind",
    name: "Northwind Corporate Travel",
    code: "NWC-114",
    type: "corporate",
    status: "active",
    country: "GB",
    contactName: "Helena Cross",
    contactEmail: "travel@northwind.example",
    contactPhone: "+44 20 7946 0900",
    defaultMarkupRate: 0,
    netRateDiscount: 10,
    commercialModel: "markup",
    agencyCommissionRate: 0,
    creditLimit: 120_000,
    creditUsed: 64_800,
    settlementTerm: "net_15",
    currency: "USD",
    seats: 220,
    tier: "standard",
    subscriptionFee: 0,
    createdAt: iso(-560),
  },
  {
    id: "org_sunpath",
    name: "SunPath Tour Operator",
    code: "SPT-207",
    type: "tour_operator",
    status: "active",
    country: "AE",
    contactName: "Mariam Al Suwaidi",
    contactEmail: "contracts@sunpath.example",
    contactPhone: "+971 4 555 0110",
    defaultMarkupRate: 18,
    netRateDiscount: 12,
    commercialModel: "markup",
    agencyCommissionRate: 0,
    creditLimit: 80_000,
    creditUsed: 12_150,
    settlementTerm: "net_7",
    currency: "USD",
    seats: 32,
    tier: "standard",
    subscriptionFee: 0,
    createdAt: iso(-300),
  },
  {
    id: "org_meridian",
    name: "Meridian Holidays",
    code: "MRH-088",
    type: "travel_agency",
    status: "pending",
    country: "IN",
    contactName: "Sanjay Iyer",
    contactEmail: "accounts@meridian.example",
    contactPhone: "+91 22 4004 8800",
    defaultMarkupRate: 10,
    netRateDiscount: 6,
    commercialModel: "agency_commission",
    agencyCommissionRate: 8,
    creditLimit: 25_000,
    creditUsed: 0,
    settlementTerm: "prepaid",
    currency: "USD",
    seats: 6,
    tier: "professional",
    subscriptionFee: 99,
    subscriptionRenewsAt: iso(72),
    createdAt: iso(-18),
  },
  {
    id: "org_atlas",
    name: "Atlas Business Travel",
    code: "ABT-330",
    type: "corporate",
    status: "suspended",
    country: "SG",
    contactName: "Wei Ling Tan",
    contactEmail: "finance@atlasbt.example",
    contactPhone: "+65 6555 0122",
    defaultMarkupRate: 0,
    netRateDiscount: 9,
    commercialModel: "markup",
    agencyCommissionRate: 0,
    creditLimit: 40_000,
    creditUsed: 39_600,
    settlementTerm: "net_30",
    currency: "USD",
    seats: 75,
    tier: "standard",
    subscriptionFee: 0,
    createdAt: iso(-640),
  },
];

/** The B2B account the demo agency user signs in as. */
export const DEMO_B2B_ACCOUNT_ID = "org_globetrek";

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export const OFFERS_SEED: Offer[] = [
  {
    id: "ofr_monsoon",
    name: "Monsoon Escape 15%",
    description: "15% off stays of 2 nights or more across Asia-Pacific.",
    scope: "platform",
    offerType: "seasonal",
    discountType: "percent",
    value: 15,
    promoCode: "MONSOON15",
    startAt: iso(-30),
    endAt: iso(45),
    minBookingAmount: 200,
    maxDiscount: 180,
    products: ["hotels", "resorts", "apartments"],
    destinations: ["Bangkok", "Bali", "Singapore", "Kuala Lumpur"],
    eligibility: "all",
    usageLimit: 500,
    perUserLimit: 2,
    used: 137,
    status: "active",
    terms: "Not combinable with other offers. Applies to the room rate only.",
    createdAt: iso(-35),
  },
  {
    id: "ofr_firsttrip",
    name: "First Trip $40 Off",
    description: "Flat $40 off the first booking for new customers.",
    scope: "platform",
    offerType: "promo_code",
    discountType: "fixed",
    value: 40,
    promoCode: "FIRST40",
    startAt: iso(-90),
    endAt: iso(120),
    minBookingAmount: 250,
    maxDiscount: 40,
    products: [],
    destinations: [],
    eligibility: "new",
    usageLimit: 1000,
    perUserLimit: 1,
    used: 412,
    status: "active",
    terms: "One use per customer. New accounts only.",
    createdAt: iso(-95),
  },
  {
    id: "ofr_flash48",
    name: "48-Hour Flash — Desert Tours",
    description: "20% off desert safaris and heritage walks.",
    scope: "merchant",
    merchantId: "mrc_desert",
    merchantName: "Desert Trails Tours",
    offerType: "flash",
    discountType: "percent",
    value: 20,
    startAt: iso(-2),
    endAt: iso(1),
    minBookingAmount: 0,
    maxDiscount: 60,
    products: ["tours", "activities"],
    destinations: ["Dubai", "Doha"],
    eligibility: "all",
    usageLimit: 100,
    perUserLimit: 1,
    used: 68,
    status: "active",
    terms: "Subject to availability. Same-day bookings excluded.",
    createdAt: iso(-3),
  },
  {
    id: "ofr_azurelong",
    name: "Azure Bay Long Stay",
    description: "$120 off stays of 5 nights or more at Azure Bay properties.",
    scope: "merchant",
    merchantId: "mrc_azure",
    merchantName: "Azure Bay Hospitality",
    offerType: "promo_code",
    discountType: "fixed",
    value: 120,
    promoCode: "AZURE5",
    startAt: iso(-60),
    endAt: iso(90),
    minBookingAmount: 900,
    maxDiscount: 120,
    products: ["hotels", "resorts"],
    destinations: [],
    eligibility: "all",
    usageLimit: 200,
    perUserLimit: 3,
    used: 54,
    status: "active",
    terms: "Minimum 5 nights. Blackout dates apply over New Year.",
    createdAt: iso(-62),
  },
  {
    id: "ofr_member10",
    name: "Member Rate 10%",
    description: "Loyalty members save 10% on every activity.",
    scope: "platform",
    offerType: "member",
    discountType: "percent",
    value: 10,
    startAt: iso(-200),
    endAt: iso(200),
    minBookingAmount: 0,
    maxDiscount: 0,
    products: ["activities", "tours", "transport"],
    destinations: [],
    eligibility: "member",
    usageLimit: 0,
    perUserLimit: 0,
    used: 903,
    status: "active",
    terms: "Applies automatically to signed-in members.",
    createdAt: iso(-205),
  },
  {
    id: "ofr_agency7",
    name: "Agency Volume 7%",
    description: "Extra 7% off net rates for agency partners above $10k monthly.",
    scope: "platform",
    offerType: "promo_code",
    discountType: "percent",
    value: 7,
    promoCode: "AGENCY7",
    startAt: iso(-120),
    endAt: iso(60),
    minBookingAmount: 500,
    maxDiscount: 400,
    products: [],
    destinations: [],
    eligibility: "b2b",
    usageLimit: 0,
    perUserLimit: 0,
    used: 76,
    status: "active",
    terms: "Applies to contracted agency accounts in good standing.",
    createdAt: iso(-125),
  },
  {
    id: "ofr_winter",
    name: "Winter Sun Preview",
    description: "12% off winter resort stays — goes live next month.",
    scope: "platform",
    offerType: "seasonal",
    discountType: "percent",
    value: 12,
    promoCode: "WINTERSUN",
    startAt: iso(25),
    endAt: iso(140),
    minBookingAmount: 400,
    maxDiscount: 200,
    products: ["resorts", "hotels"],
    destinations: ["Maldives", "Cox's Bazar", "Bali"],
    eligibility: "all",
    usageLimit: 400,
    perUserLimit: 2,
    used: 0,
    status: "scheduled",
    terms: "Bookings must be completed before the end of the sale window.",
    createdAt: iso(-8),
  },
  {
    id: "ofr_eid",
    name: "Eid Special 18%",
    description: "Expired Eid campaign kept for reporting.",
    scope: "platform",
    offerType: "seasonal",
    discountType: "percent",
    value: 18,
    promoCode: "EID18",
    startAt: iso(-160),
    endAt: iso(-120),
    minBookingAmount: 150,
    maxDiscount: 150,
    products: [],
    destinations: [],
    eligibility: "all",
    usageLimit: 600,
    perUserLimit: 2,
    used: 587,
    status: "expired",
    terms: "Campaign closed.",
    createdAt: iso(-170),
  },
  {
    id: "ofr_transferfree",
    name: "Free Airport Transfer",
    description: "$35 transfer credit on transport bookings — paused pending review.",
    scope: "merchant",
    merchantId: "mrc_transit",
    merchantName: "MetroTransit Rides",
    offerType: "promo_code",
    discountType: "fixed",
    value: 35,
    promoCode: "RIDEFREE",
    startAt: iso(-20),
    endAt: iso(40),
    minBookingAmount: 60,
    maxDiscount: 35,
    products: ["transport"],
    destinations: [],
    eligibility: "all",
    usageLimit: 150,
    perUserLimit: 1,
    used: 22,
    status: "paused",
    terms: "One transfer per booking.",
    createdAt: iso(-22),
  },
  {
    id: "ofr_visafast",
    name: "Visa Fast-Track $15 Off",
    description: "Draft offer for express visa processing.",
    scope: "merchant",
    merchantId: "mrc_visahub",
    merchantName: "VisaHub Services",
    offerType: "promo_code",
    discountType: "fixed",
    value: 15,
    promoCode: "VISAFAST",
    startAt: iso(5),
    endAt: iso(95),
    minBookingAmount: 80,
    maxDiscount: 15,
    products: ["visa"],
    destinations: [],
    eligibility: "all",
    usageLimit: 300,
    perUserLimit: 2,
    used: 0,
    status: "draft",
    terms: "Excludes embassy fees.",
    createdAt: iso(-1),
  },
];

// ---------------------------------------------------------------------------
// Combo offers
// ---------------------------------------------------------------------------

function comboItem(
  id: string,
  kind: ProductKind,
  title: string,
  merchantId: string,
  price: number,
  detail: string,
): ComboItem {
  const merchant = MERCHANTS.find((m) => m.id === merchantId)!;
  return { id, kind, title, merchantId, merchantName: merchant.name, price, detail };
}

export const COMBOS_SEED: ComboOffer[] = [
  {
    id: "cmb_dubai_explorer",
    name: "Dubai Explorer Combo",
    slug: "dubai-explorer-combo",
    description:
      "Return flights, four nights downtown, private airport transfers and an evening desert safari.",
    destination: "Dubai",
    items: [
      comboItem("ci_dxb_flight", "flights", "DAC → DXB return, Economy", "mrc_skyfare", 380, "Return flight"),
      comboItem("ci_dxb_hotel", "hotels", "Highline Central Hotel", "mrc_highline", 320, "4 nights, twin room"),
      comboItem("ci_dxb_transfer", "transport", "Airport Private Transfer", "mrc_transit", 60, "Both directions"),
      comboItem("ci_dxb_safari", "tours", "Desert Safari with BBQ", "mrc_desert", 90, "Evening, per person"),
    ],
    comboPrice: 749,
    validFrom: iso(-40),
    validTo: iso(80),
    inventory: 120,
    sold: 47,
    eligibility: "all",
    cancellationPolicyId: "moderate",
    refundHandling: "pro_rata",
    status: "active",
    terms:
      "Bundle must be booked as one transaction. Individual components cannot be re-dated separately.",
    createdAt: iso(-42),
  },
  {
    id: "cmb_maldives_honeymoon",
    name: "Maldives Honeymoon Escape",
    slug: "maldives-honeymoon-escape",
    description: "Overwater villa, seaplane transfer and a sunset cruise for two.",
    destination: "Maldives",
    items: [
      comboItem("ci_mle_resort", "resorts", "Coral Sands Retreat, Water Villa", "mrc_palm", 1450, "5 nights, half board"),
      comboItem("ci_mle_transfer", "transport", "Seaplane Transfer", "mrc_transit", 340, "Return, per couple"),
      comboItem("ci_mle_cruise", "activities", "Sunset Dolphin Cruise", "mrc_sunset", 160, "Private, 2 hours"),
    ],
    comboPrice: 1699,
    validFrom: iso(-20),
    validTo: iso(150),
    inventory: 40,
    sold: 11,
    eligibility: "all",
    cancellationPolicyId: "strict",
    refundHandling: "bundle_only",
    status: "active",
    terms: "Valid for couples travelling together. Seaplane schedule is weather dependent.",
    createdAt: iso(-25),
  },
  {
    id: "cmb_bangkok_citybreak",
    name: "Bangkok City Break + Tour",
    slug: "bangkok-city-break-tour",
    description: "Three nights in the old town with a heritage walking tour.",
    destination: "Bangkok",
    items: [
      comboItem("ci_bkk_hotel", "hotels", "Harbour Court Hotel", "mrc_cedar", 240, "3 nights, king room"),
      comboItem("ci_bkk_tour", "tours", "Old City Heritage Walk", "mrc_sunset", 75, "Half day, per person"),
      comboItem("ci_bkk_transfer", "transport", "Airport Private Transfer", "mrc_transit", 45, "Arrival only"),
    ],
    comboPrice: 309,
    validFrom: iso(-60),
    validTo: iso(30),
    inventory: 200,
    sold: 128,
    eligibility: "all",
    cancellationPolicyId: "flexible",
    refundHandling: "pro_rata",
    status: "active",
    terms: "Tour operates Tuesday to Saturday.",
    createdAt: iso(-65),
  },
  {
    id: "cmb_istanbul_family",
    name: "Istanbul Family Package",
    slug: "istanbul-family-package",
    description: "Apartment stay, museum passes and an airport transfer for four.",
    destination: "Istanbul",
    items: [
      comboItem("ci_ist_apt", "apartments", "Old Town Loft", "mrc_marina", 420, "4 nights, 2 bedrooms"),
      comboItem("ci_ist_activity", "activities", "Sky Deck Observation", "mrc_sunset", 96, "Family of 4"),
      comboItem("ci_ist_transfer", "transport", "Chauffeur Day Hire", "mrc_transit", 130, "One full day"),
    ],
    comboPrice: 579,
    validFrom: iso(10),
    validTo: iso(120),
    inventory: 60,
    sold: 0,
    eligibility: "all",
    cancellationPolicyId: "moderate",
    refundHandling: "pro_rata",
    status: "scheduled",
    terms: "Family rate covers 2 adults + 2 children under 12.",
    createdAt: iso(-5),
  },
  {
    id: "cmb_coxsbazar_weekend",
    name: "Cox's Bazar Weekend Saver",
    slug: "coxs-bazar-weekend-saver",
    description: "Beachfront resort, coach transfer and an island day tour.",
    destination: "Cox's Bazar",
    items: [
      comboItem("ci_cxb_resort", "resorts", "Palm Grove Beach Resort", "mrc_palm", 210, "2 nights, sea view"),
      comboItem("ci_cxb_coach", "transport", "Intercity Luxury Coach", "mrc_transit", 40, "Return"),
      comboItem("ci_cxb_tour", "tours", "Island Hopping Day Tour", "mrc_desert", 55, "Full day"),
    ],
    comboPrice: 259,
    validFrom: iso(-100),
    validTo: iso(-10),
    inventory: 150,
    sold: 150,
    eligibility: "all",
    cancellationPolicyId: "flexible",
    refundHandling: "pro_rata",
    status: "expired",
    terms: "Weekend departures only.",
    createdAt: iso(-110),
  },
];

// ---------------------------------------------------------------------------
// Bookings — the spine of the dataset
// ---------------------------------------------------------------------------

/** How many bookings sit in each lifecycle state (weights, not counts). */
const STATUS_WEIGHTS: [BookingStatus, number][] = [
  ["completed", 26],
  ["confirmed", 22],
  ["checked_in", 5],
  ["payment_pending", 4],
  ["payment_processing", 3],
  ["initiated", 2],
  ["failed", 9],
  ["cancellation_requested", 3],
  ["cancelled", 5],
  ["refund_pending", 4],
  ["refund_processing", 3],
  ["refunded", 8],
  ["refund_failed", 2],
];

const WEIGHTED_STATUSES: BookingStatus[] = STATUS_WEIGHTS.flatMap(([s, w]) =>
  Array.from({ length: w }, () => s),
);

const GENERIC_FAILURES: BookingFailureReason[] = [
  "payment_failed",
  "technical_error",
  "provider_rejected",
];

const FAILURE_BY_PRODUCT: Partial<Record<ProductKind, BookingFailureReason[]>> = {
  flights: ["seat_unavailable", "payment_declined", "provider_rejected", "timeout"],
  hotels: ["room_unavailable", "payment_failed", "provider_rejected"],
  resorts: ["room_unavailable", "provider_rejected"],
  apartments: ["inventory_unavailable", "payment_failed"],
  tours: ["inventory_unavailable", "timeout"],
  activities: ["inventory_unavailable", "technical_error"],
  transport: ["inventory_unavailable", "provider_rejected"],
  visa: ["provider_rejected", "fraud_check"],
};

/** Statuses that can only be reached after the booking was confirmed once. */
const CONFIRMATION_REACHED: readonly BookingStatus[] = [
  "confirmed",
  "checked_in",
  "completed",
  "cancellation_requested",
  "cancelled",
  "refund_pending",
  "refund_processing",
  "refunded",
  "refund_failed",
];

function paymentStatusFor(
  status: BookingStatus,
  failureReason: BookingFailureReason | undefined,
): PaymentStatus {
  switch (status) {
    case "initiated":
      return "pending";
    case "payment_pending":
      return "pending";
    case "payment_processing":
      return "processing";
    case "confirmed":
    case "checked_in":
    case "completed":
    case "cancellation_requested":
      return "captured";
    case "failed":
      return failureReason === "payment_failed" || failureReason === "payment_declined"
        ? "failed"
        : "captured";
    case "cancelled":
      return "captured";
    case "refund_pending":
    case "refund_processing":
    case "refund_failed":
      return "refund_pending";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}

function travelersFor(
  r: () => number,
  count: number,
  segment: BookingSegment,
  orgName?: string,
): Traveler[] {
  return Array.from({ length: count }, (_, i) => {
    const name = pick(CUSTOMER_NAMES, r);
    return {
      id: `trv_${Math.floor(r() * 1e6).toString(36)}${i}`,
      fullName: name,
      type: i === 0 ? "adult" : i === count - 1 && count > 2 ? "child" : "adult",
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      nationality: pick(["BD", "AE", "GB", "SG", "IN", "US"], r),
      employeeRef: segment === "b2b" && orgName ? `EMP-${int(r, 1000, 9999)}` : undefined,
    } satisfies Traveler;
  });
}

function buildTimeline(
  status: BookingStatus,
  createdAt: string,
  paymentStatus: PaymentStatus,
  failureReason: BookingFailureReason | undefined,
  productKind: ProductKind,
): BookingEvent[] {
  const start = new Date(createdAt).getTime();
  const step = (n: number) => new Date(start + n * 1_800_000).toISOString();
  const events: BookingEvent[] = [
    {
      id: "ev_1",
      at: step(0),
      status: "initiated",
      label: "Booking initiated",
      note: "Customer selected the option and started checkout.",
      actor: "system",
      tone: "neutral",
    },
  ];

  if (status !== "initiated") {
    events.push({
      id: "ev_2",
      at: step(1),
      status: "payment_pending",
      paymentStatus: "pending",
      label: "Awaiting payment",
      actor: "system",
      tone: "warning",
    });
  }

  if (status !== "initiated" && status !== "payment_pending") {
    events.push({
      id: "ev_3",
      at: step(2),
      status: "payment_processing",
      paymentStatus: "processing",
      label: "Payment processing",
      note: "Charge sent to the gateway.",
      actor: "system",
      tone: "warning",
    });
  }

  if (status === "failed") {
    const paymentSide =
      failureReason === "payment_failed" || failureReason === "payment_declined";
    if (!paymentSide) {
      events.push({
        id: "ev_4",
        at: step(3),
        paymentStatus: "captured",
        label: "Payment captured",
        note: "Funds captured before the provider responded.",
        actor: "system",
        tone: "success",
      });
    }
    events.push({
      id: "ev_5",
      at: step(4),
      status: "failed",
      paymentStatus,
      label: `Booking failed — ${FAILURE_REASON_LABELS[failureReason ?? "technical_error"]}`,
      note: paymentSide
        ? "No money was captured; nothing to refund."
        : "Payment was captured but the booking could not be delivered — refund owed.",
      actor: "system",
      tone: "danger",
    });
    if (!paymentSide) {
      events.push({
        id: "ev_6",
        at: step(5),
        label: "Refund initiated automatically",
        note: "Captured payment queued for return under the failed-booking rule.",
        actor: "system",
        tone: "warning",
      });
    }
    return events;
  }

  if (CONFIRMATION_REACHED.includes(status)) {
    events.push({
      id: "ev_4",
      at: step(3),
      paymentStatus: "captured",
      label: "Payment captured",
      actor: "system",
      tone: "success",
    });
    events.push({
      id: "ev_5",
      at: step(4),
      status: "confirmed",
      label: "Booking confirmed",
      note: "Provider accepted the reservation. Voucher and invoice issued.",
      actor: "system",
      tone: "success",
    });
  }

  if (status === "checked_in" || status === "completed") {
    if (hasCheckIn(productKind)) {
      events.push({
        id: "ev_6",
        at: step(48),
        status: "checked_in",
        label: "Guest checked in",
        actor: "merchant",
        tone: "neutral",
      });
    }
  }
  if (status === "completed") {
    events.push({
      id: "ev_7",
      at: step(96),
      status: "completed",
      label: "Trip completed",
      note: "Earning released for settlement.",
      actor: "system",
      tone: "success",
    });
  }

  if (
    status === "cancellation_requested" ||
    status === "cancelled" ||
    status.startsWith("refund")
  ) {
    events.push({
      id: "ev_6",
      at: step(60),
      status: "cancellation_requested",
      label: "Cancellation requested",
      note: "Customer requested cancellation; policy applied.",
      actor: "customer",
      tone: "warning",
    });
  }
  if (status === "cancelled" || status.startsWith("refund")) {
    events.push({
      id: "ev_7",
      at: step(62),
      status: "cancelled",
      label: "Booking cancelled",
      actor: "admin",
      tone: "neutral",
    });
  }
  if (status.startsWith("refund")) {
    events.push({
      id: "ev_8",
      at: step(64),
      status: "refund_pending",
      paymentStatus: "refund_pending",
      label: "Refund pending approval",
      actor: "system",
      tone: "warning",
    });
  }
  if (status === "refund_processing" || status === "refunded" || status === "refund_failed") {
    events.push({
      id: "ev_9",
      at: step(70),
      status: "refund_processing",
      label: "Refund sent to provider",
      actor: "finance",
      tone: "neutral",
    });
  }
  if (status === "refunded") {
    events.push({
      id: "ev_10",
      at: step(96),
      status: "refunded",
      paymentStatus: "refunded",
      label: "Refund completed",
      note: "Money returned to the original payment method.",
      actor: "system",
      tone: "success",
    });
  }
  if (status === "refund_failed") {
    events.push({
      id: "ev_10",
      at: step(96),
      status: "refund_failed",
      label: "Refund failed at the provider",
      note: "Card no longer valid — finance to arrange a bank transfer.",
      actor: "system",
      tone: "danger",
    });
  }

  return events;
}

function buildBookings(): Booking[] {
  const r = rng(20260811);
  const bookings: Booking[] = [];
  const total = 96;

  for (let i = 0; i < total; i += 1) {
    const status = WEIGHTED_STATUSES[i % WEIGHTED_STATUSES.length];
    const isCombo = i % 11 === 0;
    const group = pick(PRODUCTS, r);
    const productKind: ProductKind = isCombo ? "combo" : group.kind;
    const combo = isCombo ? COMBOS_SEED[i % 3] : undefined;
    const merchantId = isCombo
      ? combo!.items[0].merchantId
      : pick(group.merchants, r);
    const merchant = MERCHANTS.find((m) => m.id === merchantId)!;
    const productTitle = isCombo ? combo!.name : pick(group.titles, r);
    const destination = isCombo ? combo!.destination : pick(DESTINATIONS, r);

    // B2B every ~4th booking, weighted to agency channel.
    const segment: BookingSegment = i % 4 === 1 ? "b2b" : "b2c";
    const account =
      segment === "b2b"
        ? B2B_ACCOUNTS.filter((a) => a.status === "active")[i % 3]
        : undefined;

    const channel: BookingChannel =
      segment === "b2b" ? "agency" : pick(CHANNELS.slice(0, 3), r);

    const customerName = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const customer: CustomerRef = {
      id: `cus_${1000 + (i % CUSTOMER_NAMES.length)}`,
      name: customerName,
      email: `${customerName.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      organizationId: account?.id,
      organizationName: account?.name,
    };

    const nights = productKind === "flights" || productKind === "visa" ? 0 : int(r, 1, 7);
    const quantity = int(r, 1, 4);
    // Spread trips from 90 days ago to 120 days out; terminal states sit in the past.
    const isPast =
      status === "completed" || status === "refunded" || status === "cancelled";
    const startOffset = isPast ? -int(r, 3, 90) : int(r, -2, 120);
    const startAt = iso(startOffset, 14);
    const endAt = iso(startOffset + Math.max(nights, 1), 11);
    const createdAt = iso(startOffset - int(r, 5, 60), 9);

    const base = isCombo
      ? combo!.comboPrice
      : money(int(r, 60, 620) * (productKind === "flights" ? 1.4 : 1) * quantity);

    // Discounts: apply a real offer to roughly a third of bookings.
    const discounts: AppliedDiscount[] = [];
    if (i % 3 === 0) {
      const offer = OFFERS_SEED[i % OFFERS_SEED.length];
      const amount =
        offer.discountType === "percent"
          ? money(
              Math.min(
                base * (offer.value / 100),
                offer.maxDiscount > 0 ? offer.maxDiscount : Number.MAX_SAFE_INTEGER,
              ),
            )
          : offer.value;
      if (amount > 0 && amount < base) {
        discounts.push({
          kind: offer.promoCode ? "coupon" : "offer",
          ref: offer.promoCode ?? offer.id,
          label: offer.name,
          amount,
        });
      }
    }
    if (isCombo) {
      const totals = comboTotals(combo!);
      discounts.push({
        kind: "combo",
        ref: combo!.id,
        label: `${combo!.name} bundle saving`,
        amount: totals.savings,
      });
    }
    const discount = money(discounts.reduce((n, d) => n + d.amount, 0));

    // B2B: agency buys at a net rate and adds its markup.
    const b2b =
      segment === "b2b" && account
        ? priceB2B({
            publicRate: base,
            netRateDiscount: account.netRateDiscount,
            markupRate: account.defaultMarkupRate,
          })
        : null;

    const commissionRate = commissionRateFor(productKind, merchant.commissionRate);
    const priced = priceBooking({
      base: b2b ? b2b.netRate : base,
      markup: b2b ? b2b.markup : 0,
      discount: Math.min(discount, (b2b ? b2b.netRate : base) * 0.4),
      commissionRate,
    });

    const failureReason: BookingFailureReason | undefined =
      status === "failed"
        ? pick(FAILURE_BY_PRODUCT[productKind] ?? GENERIC_FAILURES, r)
        : undefined;

    const paymentStatus = paymentStatusFor(status, failureReason);
    const pm = PAYMENT_METHODS[i % PAYMENT_METHODS.length];
    const payment: Payment = {
      id: `pay_${pad(3000 + i)}`,
      reference: `PMT-${pad(48000 + i)}`,
      method: segment === "b2b" ? "Credit account" : pm.method,
      instrument: segment === "b2b" ? `${account?.code ?? "B2B"} · ${account?.settlementTerm ?? "net_30"}` : pm.instrument,
      status: paymentStatus,
      amount: priced.total,
      currency: priced.currency,
      capturedAt:
        paymentStatus === "captured" ||
        paymentStatus === "refunded" ||
        paymentStatus === "refund_pending" ||
        paymentStatus === "partially_refunded"
          ? iso(startOffset - int(r, 1, 5), 12)
          : undefined,
      gatewayRef: `gw_${Math.floor(r() * 1e9).toString(36)}`,
      failureCode: paymentStatus === "failed" ? "card_declined" : undefined,
      failureMessage:
        paymentStatus === "failed"
          ? "The issuing bank declined the transaction."
          : undefined,
    };

    const policyId =
      isCombo && combo ? combo.cancellationPolicyId : defaultPolicyFor(productKind);

    // Refunded bookings carry their refund back into the money model.
    let money_ = priced;
    if (status === "refunded") {
      const quote = quoteRefund({
        booking: {
          money: priced,
          cancellationPolicyId: policyId,
          startAt,
          status,
        },
        reason: "customer_cancellation",
        at: iso(startOffset - 2),
      });
      const refundAmount = quote.refundAmount > 0 ? quote.refundAmount : priced.total;
      money_ = priceBooking({
        base: priced.base,
        markup: priced.markup,
        discount: priced.discount,
        commissionRate,
        refunded: refundAmount,
        commissionReversed: quote.commissionReversed,
        platformCancellationFee: quote.platformCancellationFee,
      });
    }

    bookings.push({
      id: `bkg_${pad(10_000 + i)}`,
      reference: `SO-${pad(24_000 + i)}`,
      segment,
      channel,
      productKind,
      productTitle,
      destination,
      comboId: combo?.id,
      merchant,
      customer,
      travelers: travelersFor(r, Math.min(quantity, 3), segment, account?.name),
      startAt,
      endAt,
      nights,
      quantity,
      status,
      failureReason,
      failureNote:
        failureReason && FAILURE_REASON_LABELS[failureReason]
          ? FAILURE_REASON_LABELS[failureReason]
          : undefined,
      payment,
      money: money_,
      discounts,
      cancellationPolicyId: policyId,
      createdAt,
      updatedAt: iso(startOffset + 1, 16),
      timeline: buildTimeline(status, createdAt, paymentStatus, failureReason, productKind),
      invoiceNumber: `INV-${pad(76_000 + i)}`,
      refundIds: [],
      settlementId: undefined,
    });
  }

  return bookings;
}

export const BOOKINGS_SEED: Booking[] = buildBookings();

// ---------------------------------------------------------------------------
// Refunds — derived from bookings so amounts always reconcile
// ---------------------------------------------------------------------------

const REFUND_STATUS_BY_BOOKING: Partial<Record<BookingStatus, RefundStatus>> = {
  refund_pending: "requested",
  refund_processing: "processing",
  refunded: "completed",
  refund_failed: "failed",
  cancelled: "under_review",
};

function refundReasonFor(booking: Booking): RefundReason {
  if (booking.status === "failed") {
    return booking.payment.status === "captured"
      ? "payment_captured_booking_failed"
      : "booking_failed";
  }
  if (booking.channel === "call_center") return "goodwill";
  return "customer_cancellation";
}

function buildRefunds(bookings: Booking[]): Refund[] {
  const r = rng(770311);
  const refunds: Refund[] = [];
  let n = 0;

  for (const booking of bookings) {
    const needsRefund =
      booking.status in REFUND_STATUS_BY_BOOKING ||
      (booking.status === "failed" && booking.payment.status === "captured");
    if (!needsRefund) continue;

    const reason = refundReasonFor(booking);
    const quote = quoteRefund({
      booking,
      reason,
      at: booking.updatedAt,
    });
    const status: RefundStatus =
      booking.status === "failed"
        ? pick(["approved", "processing", "completed"] as RefundStatus[], r)
        : (REFUND_STATUS_BY_BOOKING[booking.status] ?? "requested");

    // A refunded booking already carries its amount; otherwise use the quote.
    const refundAmount =
      booking.money.refunded > 0 ? booking.money.refunded : quote.refundAmount;
    const kind = refundAmount <= 0 ? "none" : quote.kind;

    const id = `rfd_${pad(5000 + n)}`;
    refunds.push({
      id,
      reference: `RFD-${pad(33_000 + n)}`,
      bookingId: booking.id,
      bookingRef: booking.reference,
      customer: booking.customer,
      merchant: booking.merchant,
      segment: booking.segment,
      kind,
      reason,
      note:
        reason === "payment_captured_booking_failed"
          ? "Payment was captured but the provider could not deliver the booking."
          : undefined,
      status,
      currency: booking.money.currency,
      originalAmount: booking.money.total,
      cancellationFee: quote.cancellationFee,
      taxAdjustment: quote.taxAdjustment,
      refundAmount,
      commissionReversed: quote.commissionReversed,
      insuranceRefund: quote.insuranceRefund,
      insuranceRevenueReversed: quote.insuranceRevenueReversed,
      platformCancellationFee: quote.platformCancellationFee,
      merchantDeduction: quote.merchantDeduction,
      method:
        booking.segment === "b2b"
          ? "Credit note"
          : booking.payment.method === "Card"
            ? `Original card (${booking.payment.instrument})`
            : booking.payment.method,
      requestedAt: booking.updatedAt,
      reviewedAt:
        status === "requested" ? undefined : iso(int(r, -40, -1), 11),
      processedAt:
        status === "completed" || status === "failed" ? iso(int(r, -30, -1), 15) : undefined,
      decidedBy:
        status === "requested" || status === "under_review" ? undefined : "Sana Rahman",
      decisionNote:
        status === "rejected"
          ? "Outside the cancellation window and no provider fault."
          : undefined,
      failureMessage:
        status === "failed"
          ? "Provider rejected the refund — original card expired."
          : undefined,
    });
    booking.refundIds.push(id);
    n += 1;
  }

  // A couple of explicitly rejected requests so the console has every state.
  const candidates = bookings.filter(
    (b) => b.status === "completed" && b.cancellationPolicyId === "non_refundable",
  );
  candidates.slice(0, 2).forEach((booking, idx) => {
    const quote = quoteRefund({ booking, reason: "customer_cancellation" });
    const id = `rfd_${pad(5900 + idx)}`;
    refunds.push({
      id,
      reference: `RFD-${pad(33_900 + idx)}`,
      bookingId: booking.id,
      bookingRef: booking.reference,
      customer: booking.customer,
      merchant: booking.merchant,
      segment: booking.segment,
      kind: "none",
      reason: "customer_cancellation",
      status: "rejected",
      currency: booking.money.currency,
      originalAmount: booking.money.total,
      cancellationFee: quote.cancellationFee,
      taxAdjustment: 0,
      refundAmount: 0,
      commissionReversed: 0,
      insuranceRefund: 0,
      insuranceRevenueReversed: 0,
      platformCancellationFee: 0,
      merchantDeduction: 0,
      method: "—",
      requestedAt: iso(-12 - idx, 9),
      reviewedAt: iso(-11 - idx, 14),
      decidedBy: "Sana Rahman",
      decisionNote: "Non-refundable rate — no refund due under the booking terms.",
    });
    booking.refundIds.push(id);
  });

  return refunds;
}

export const REFUNDS_SEED: Refund[] = buildRefunds(BOOKINGS_SEED);

// ---------------------------------------------------------------------------
// Commission ledger — one entry per revenue-relevant booking
// ---------------------------------------------------------------------------

function commissionStatusFor(booking: Booking): CommissionEntry["status"] {
  if (booking.money.commissionReversed > 0) return "reversed";
  if (booking.status === "completed") return "settled";
  if (booking.status === "failed") return "reversed";
  return "pending";
}

export const COMMISSIONS_SEED: CommissionEntry[] = BOOKINGS_SEED.filter(
  (b) => b.money.commission > 0,
).map((booking, i) => ({
  id: `cmn_${pad(6000 + i)}`,
  reference: `CMN-${pad(91_000 + i)}`,
  bookingId: booking.id,
  bookingRef: booking.reference,
  merchantId: booking.merchant.id,
  merchantName: booking.merchant.name,
  productKind: booking.productKind,
  segment: booking.segment,
  currency: booking.money.currency,
  netSale: booking.money.netSale,
  rate: booking.money.commissionRate,
  commission: booking.money.commission,
  merchantEarning: booking.money.merchantEarning,
  reversed: booking.money.commissionReversed,
  status: commissionStatusFor(booking),
  createdAt: booking.createdAt,
}));

// ---------------------------------------------------------------------------
// Settlements — monthly batches per merchant, derived from bookings
// ---------------------------------------------------------------------------

const SETTLEMENT_METHODS = ["Bank transfer", "Wallet", "PayPal"];

function monthKey(iso_: string): string {
  return iso_.slice(0, 7);
}

function buildSettlements(bookings: Booking[]): Settlement[] {
  const r = rng(9911);
  // Only delivered/settleable bookings contribute to a payout.
  const settleable = bookings.filter((b) =>
    ["completed", "checked_in", "confirmed", "refunded", "cancelled"].includes(b.status),
  );

  const groups = new Map<string, Booking[]>();
  for (const b of settleable) {
    const key = `${b.merchant.id}|${monthKey(b.startAt)}`;
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  }

  const settlements: Settlement[] = [];
  let n = 0;
  const sortedKeys = [...groups.keys()].sort();

  for (const key of sortedKeys) {
    const [merchantId, month] = key.split("|");
    const group = groups.get(key)!;
    const merchant = MERCHANTS.find((m) => m.id === merchantId)!;
    const totals = settlementTotals(group);
    if (totals.netPayable <= 0) continue;

    const [year, mon] = month.split("-").map(Number);
    const periodStart = new Date(Date.UTC(year, mon - 1, 1)).toISOString();
    const periodEnd = new Date(Date.UTC(year, mon, 0, 23, 59)).toISOString();
    const payoutDate = new Date(Date.UTC(year, mon, 5, 10)).toISOString();
    const isPast = new Date(payoutDate).getTime() < NOW_MS;

    const status: Settlement["status"] = isPast
      ? totals.refundAdjustment > totals.netPayable * 0.5
        ? "on_hold"
        : "paid"
      : n % 7 === 3
        ? "processing"
        : n % 5 === 2
          ? "scheduled"
          : "pending";

    const id = `stl_${pad(7000 + n)}`;
    settlements.push({
      id,
      reference: `STL-${pad(52_000 + n)}`,
      merchantId,
      merchantName: merchant.name,
      currency: "USD",
      periodStart,
      periodEnd,
      bookingCount: totals.bookingCount,
      grossSales: totals.grossSales,
      discounts: totals.discounts,
      commission: totals.commission,
      refundAdjustment: totals.refundAdjustment,
      netPayable: totals.netPayable,
      status,
      method: pick(SETTLEMENT_METHODS, r),
      scheduledFor: payoutDate,
      paidAt: status === "paid" ? payoutDate : undefined,
      bookingIds: group.map((b) => b.id),
    });
    for (const b of group) b.settlementId = id;
    n += 1;
  }

  return settlements.sort(
    (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
  );
}

export const SETTLEMENTS_SEED: Settlement[] = buildSettlements(BOOKINGS_SEED);

// ---------------------------------------------------------------------------
// B2B invoices — one per account per month of B2B bookings
// ---------------------------------------------------------------------------

function buildB2BInvoices(bookings: Booking[]): B2BInvoice[] {
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (b.segment !== "b2b" || !b.customer.organizationId) continue;
    if (b.status === "failed" || b.status === "initiated") continue;
    const key = `${b.customer.organizationId}|${monthKey(b.createdAt)}`;
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  }

  const invoices: B2BInvoice[] = [];
  let n = 0;
  for (const key of [...groups.keys()].sort()) {
    const [accountId, month] = key.split("|");
    const group = groups.get(key)!;
    const account = B2B_ACCOUNTS.find((a) => a.id === accountId)!;
    const netAmount = money(group.reduce((s, b) => s + b.money.base, 0));
    const markup = money(group.reduce((s, b) => s + b.money.markup, 0));
    const taxes = money(group.reduce((s, b) => s + b.money.taxes, 0));
    const total = money(netAmount + markup + taxes);

    const [year, mon] = month.split("-").map(Number);
    const issuedAt = new Date(Date.UTC(year, mon, 1, 9)).toISOString();
    const termDays = { prepaid: 0, net_7: 7, net_15: 15, net_30: 30 }[
      account.settlementTerm
    ];
    const dueAt = new Date(new Date(issuedAt).getTime() + termDays * DAY).toISOString();
    const overdue = new Date(dueAt).getTime() < NOW_MS;

    const status: B2BInvoice["status"] =
      n % 4 === 0 ? "paid" : overdue ? "overdue" : n % 3 === 1 ? "part_paid" : "issued";
    const paid =
      status === "paid" ? total : status === "part_paid" ? money(total * 0.4) : 0;

    invoices.push({
      id: `b2i_${pad(8000 + n)}`,
      number: `B2B-${pad(41_000 + n)}`,
      accountId,
      accountName: account.name,
      currency: "USD",
      issuedAt,
      dueAt,
      status,
      bookingIds: group.map((b) => b.id),
      netAmount,
      markup,
      taxes,
      total,
      paid,
      balance: money(total - paid),
    });
    n += 1;
  }

  return invoices.sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );
}

export const B2B_INVOICES_SEED: B2BInvoice[] = buildB2BInvoices(BOOKINGS_SEED);

// ---------------------------------------------------------------------------
// Audit log + notifications
// ---------------------------------------------------------------------------

const AUDIT_ACTORS = [
  { id: "usr_admin_demo", name: "Sana Rahman", role: "Admin" },
  { id: "usr_super_demo", name: "AH Nayeem", role: "Super Admin" },
  { id: "usr_finance_demo", name: "Priya Nair", role: "Finance" },
  { id: "usr_merchant_demo", name: "Marco Silva", role: "Merchant" },
  { id: "usr_support_demo", name: "Tariq Aziz", role: "Support" },
];

function buildAuditLog(
  bookings: Booking[],
  refunds: Refund[],
  settlements: Settlement[],
): AuditLogEntry[] {
  const r = rng(4242);
  const entries: AuditLogEntry[] = [];
  let n = 0;

  const push = (e: Omit<AuditLogEntry, "id" | "ip">) => {
    entries.push({
      ...e,
      id: `aud_${pad(90_000 + n)}`,
      ip: `103.${int(r, 10, 250)}.${int(r, 10, 250)}.${int(r, 2, 250)}`,
    });
    n += 1;
  };

  for (const refund of refunds.slice(0, 14)) {
    const actor = AUDIT_ACTORS[n % AUDIT_ACTORS.length];
    if (refund.status === "rejected") {
      push({
        at: refund.reviewedAt ?? refund.requestedAt,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: "reject",
        entity: "refund",
        entityId: refund.id,
        entityLabel: refund.reference,
        summary: `Rejected refund ${refund.reference} for booking ${refund.bookingRef}`,
        from: "requested",
        to: "rejected",
      });
    } else if (refund.status === "completed") {
      push({
        at: refund.processedAt ?? refund.requestedAt,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: "refund",
        entity: "refund",
        entityId: refund.id,
        entityLabel: refund.reference,
        summary: `Processed refund of $${refund.refundAmount.toFixed(2)} for ${refund.bookingRef}`,
        from: "approved",
        to: "completed",
      });
    } else {
      push({
        at: refund.requestedAt,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        action: "approve",
        entity: "refund",
        entityId: refund.id,
        entityLabel: refund.reference,
        summary: `Approved refund ${refund.reference} pending processing`,
        from: "requested",
        to: "approved",
      });
    }
  }

  for (const booking of bookings.filter((b) => b.status === "failed").slice(0, 8)) {
    push({
      at: booking.updatedAt,
      actorId: "system",
      actorName: "System",
      actorRole: "System",
      action: "status_change",
      entity: "booking",
      entityId: booking.id,
      entityLabel: booking.reference,
      summary: `Booking ${booking.reference} failed — ${FAILURE_REASON_LABELS[booking.failureReason ?? "technical_error"]}`,
      from: "payment_processing",
      to: "failed",
    });
  }

  for (const settlement of settlements.slice(0, 8)) {
    push({
      at: settlement.paidAt ?? settlement.scheduledFor,
      actorId: "usr_finance_demo",
      actorName: "Priya Nair",
      actorRole: "Finance",
      action: "settle",
      entity: "settlement",
      entityId: settlement.id,
      entityLabel: settlement.reference,
      summary: `Settlement ${settlement.reference} for ${settlement.merchantName} — $${settlement.netPayable.toFixed(2)}`,
      to: settlement.status,
    });
  }

  for (const offer of OFFERS_SEED.slice(0, 6)) {
    push({
      at: offer.createdAt,
      actorId: offer.scope === "merchant" ? "usr_merchant_demo" : "usr_admin_demo",
      actorName: offer.scope === "merchant" ? "Marco Silva" : "Sana Rahman",
      actorRole: offer.scope === "merchant" ? "Merchant" : "Admin",
      action: "create",
      entity: "offer",
      entityId: offer.id,
      entityLabel: offer.name,
      summary: `Created ${offer.scope} offer "${offer.name}"`,
      to: offer.status,
    });
  }

  push({
    at: iso(-4, 11),
    actorId: "usr_admin_demo",
    actorName: "Sana Rahman",
    actorRole: "Admin",
    action: "suspend",
    entity: "b2b_account",
    entityId: "org_atlas",
    entityLabel: "Atlas Business Travel",
    summary: "Suspended Atlas Business Travel — credit limit exceeded",
    from: "active",
    to: "suspended",
  });
  push({
    at: iso(-6, 15),
    actorId: "usr_super_demo",
    actorName: "AH Nayeem",
    actorRole: "Super Admin",
    action: "update",
    entity: "commission_rule",
    entityId: "mrc_desert",
    entityLabel: "Desert Trails Tours",
    summary: "Commission rate changed for Desert Trails Tours",
    from: "16%",
    to: "18%",
  });
  push({
    at: iso(-1, 8),
    actorId: "usr_admin_demo",
    actorName: "Sana Rahman",
    actorRole: "Admin",
    action: "login",
    entity: "session",
    entityId: "sess_demo",
    entityLabel: "admin@otithee.com",
    summary: "Signed in to the admin dashboard",
  });

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export const AUDIT_LOG_SEED: AuditLogEntry[] = buildAuditLog(
  BOOKINGS_SEED,
  REFUNDS_SEED,
  SETTLEMENTS_SEED,
);

function buildNotifications(
  bookings: Booking[],
  refunds: Refund[],
  settlements: Settlement[],
): PlatformNotification[] {
  const out: PlatformNotification[] = [];
  let n = 0;
  const add = (
    notification: Omit<PlatformNotification, "id" | "read"> & { read?: boolean },
  ) => {
    out.push({ ...notification, id: `ntf_${pad(20_000 + n)}`, read: notification.read ?? false });
    n += 1;
  };

  for (const b of bookings.filter((x) => x.status === "confirmed").slice(0, 4)) {
    add({
      category: "booking",
      audience: ["admin", "merchant", "customer"],
      title: "Booking confirmed",
      body: `${b.reference} · ${b.productTitle} for ${b.customer.name}`,
      href: `/dashboard/bookings/${b.id}`,
      createdAt: b.updatedAt,
      tone: "success",
      merchantId: b.merchant.id,
      customerId: b.customer.id,
    });
  }
  for (const b of bookings.filter((x) => x.status === "failed").slice(0, 3)) {
    const captured = b.payment.status === "captured";
    add({
      category: captured ? "payment" : "booking",
      audience: ["admin", "customer"],
      title: captured ? "Payment captured but booking failed" : "Booking failed",
      body: `${b.reference} · ${FAILURE_REASON_LABELS[b.failureReason ?? "technical_error"]}${
        captured ? " — refund initiated automatically." : ""
      }`,
      href: `/dashboard/bookings/${b.id}`,
      createdAt: b.updatedAt,
      tone: "danger",
      merchantId: b.merchant.id,
      customerId: b.customer.id,
    });
  }
  for (const r of refunds.slice(0, 4)) {
    add({
      category: "refund",
      audience: ["admin", "merchant", "customer"],
      title:
        r.status === "completed"
          ? "Refund completed"
          : r.status === "rejected"
            ? "Refund rejected"
            : "Refund requested",
      body: `${r.reference} · ${r.bookingRef} · $${r.refundAmount.toFixed(2)}`,
      href: `/dashboard/finance/refunds`,
      createdAt: r.processedAt ?? r.requestedAt,
      tone: r.status === "completed" ? "success" : r.status === "rejected" ? "danger" : "warning",
      merchantId: r.merchant.id,
      customerId: r.customer.id,
    });
  }
  for (const s of settlements.filter((x) => x.status === "paid").slice(0, 3)) {
    add({
      category: "settlement",
      audience: ["admin", "merchant"],
      title: "Settlement paid",
      body: `${s.reference} · ${s.merchantName} · $${s.netPayable.toFixed(2)}`,
      href: "/dashboard/finance/settlements",
      createdAt: s.paidAt ?? s.scheduledFor,
      tone: "success",
      merchantId: s.merchantId,
      read: true,
    });
  }
  add({
    category: "offer",
    audience: ["admin", "merchant"],
    title: "Offer expiring soon",
    body: "48-Hour Flash — Desert Tours ends tomorrow.",
    href: "/dashboard/promotions/offers",
    createdAt: iso(-1, 9),
    tone: "warning",
    merchantId: "mrc_desert",
  });
  add({
    category: "commission",
    audience: ["admin", "merchant"],
    title: "Commission rate updated",
    body: "Desert Trails Tours moved from 16% to 18% effective next cycle.",
    href: "/dashboard/finance/commission",
    createdAt: iso(-6, 15),
    tone: "neutral",
    merchantId: "mrc_desert",
  });
  add({
    category: "system",
    audience: ["admin"],
    title: "Agency credit limit breached",
    body: "Atlas Business Travel is at 99% of its $40,000 credit limit.",
    href: "/dashboard/b2b/accounts",
    createdAt: iso(-4, 11),
    tone: "danger",
    organizationId: "org_atlas",
  });
  add({
    category: "review",
    audience: ["admin", "merchant"],
    title: "New review awaiting moderation",
    body: "4.6★ review on Azure Bay Grand mentions a billing issue.",
    href: "/dashboard/reviews",
    createdAt: iso(-2, 13),
    tone: "neutral",
    merchantId: "mrc_azure",
  });
  add({
    category: "support",
    audience: ["admin"],
    title: "Support ticket escalated",
    body: "Ticket #4821 — refund not received after 10 days.",
    href: "/dashboard/support",
    createdAt: iso(-3, 10),
    tone: "warning",
  });

  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const NOTIFICATIONS_SEED: PlatformNotification[] = buildNotifications(
  BOOKINGS_SEED,
  REFUNDS_SEED,
  SETTLEMENTS_SEED,
);

/** Cancellation policies, re-exported so forms can build their options. */
export { CANCELLATION_POLICY_LIST };

/** Distinct destinations in the dataset — powers facet filters. */
export const DESTINATION_OPTIONS = DESTINATIONS;
