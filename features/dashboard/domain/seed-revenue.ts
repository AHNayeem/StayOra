/**
 * Deterministic demo data for every platform revenue stream.
 *
 * Like the rest of the seed layer this is derived, not invented: insurance
 * policies attach to bookings that really exist and re-price them through the
 * money engine, membership subscriptions belong to customers who really booked,
 * advertising campaigns are attributed to real destinations, and every
 * commission rule targets a real merchant or vertical.
 *
 * Nothing here reads the wall clock or a random number — the same rows render
 * on the server and the client, and the totals on the Revenue Center always
 * reconcile with the booking ledger.
 */

import { PLATFORM_NOW, priceBooking } from "./money";
import { DEMO_CUSTOMER } from "./seed-extra";
import { B2B_ACCOUNTS, MERCHANTS } from "./seed";
import type { CommissionRule } from "./commission-rules";
import type { RevenueEntry } from "./revenue";
import type { InsurancePlan, InsurancePolicy, InsuranceProvider } from "./insurance";
import type { MembershipPlan, MembershipSubscription } from "./membership";
import type { AdCampaign, Advertiser } from "./advertising";
import type { PricingRule } from "./revenue-management";
import type { B2BSubUser, Booking, ProductKind } from "./types";

const NOW_MS = new Date(PLATFORM_NOW).getTime();
const DAY = 86_400_000;

function iso(daysFromNow: number, hour = 9): string {
  const d = new Date(NOW_MS + daysFromNow * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Small stable hash, so "random-looking" seeded numbers never move. */
function hash(input: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return Math.abs(h);
}

// ---------------------------------------------------------------------------
// Commission rules
// ---------------------------------------------------------------------------

function rule(
  id: string,
  input: Omit<CommissionRule, "id" | "createdAt" | "updatedAt" | "updatedBy">,
): CommissionRule {
  return {
    ...input,
    id,
    createdAt: iso(-240),
    updatedAt: iso(-30),
    updatedBy: "Priya Raman",
  };
}

/**
 * The demo commission book. Vertical rules set the platform's published take
 * rates; the merchant and product rules below are the negotiated exceptions
 * that make the resolution order visible in the admin UI.
 */
function commissionRulesSeed(): CommissionRule[] {
  const verticals: [ProductKind, string, number][] = [
    ["hotels", "Hotels", 15],
    ["apartments", "Apartments", 14],
    ["resorts", "Resorts", 13],
    ["shared-rooms", "Shared rooms", 10],
    ["convention-hall", "Convention halls", 9],
    ["tours", "Tours", 12],
    ["activities", "Activities", 10],
    ["transport", "Transport", 15],
    ["flights", "Flights", 5],
    ["visa", "Visa services", 8],
    ["combo", "Combo bundles", 15],
  ];

  const rows: CommissionRule[] = verticals.map(([kind, label, percent], index) =>
    rule(`cmr_v_${kind}`, {
      name: `${label} — standard rate`,
      scope: "vertical",
      targetId: kind,
      targetLabel: label,
      calc: "percent",
      percent,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
      basis: "net",
      effectiveFrom: iso(-365 + index),
      status: "active",
      note: "Published platform take rate.",
    }),
  );

  // --- negotiated exceptions ---------------------------------------------
  rows.push(
    rule("cmr_m_azure", {
      name: "Azure Bay — volume rate",
      scope: "merchant",
      targetId: "mrc_azure",
      targetLabel: "Azure Bay Hospitality",
      calc: "percent",
      percent: 12,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
      basis: "net",
      effectiveFrom: iso(-200),
      status: "active",
      note: "Negotiated down from 15% at 500+ bookings/month.",
    }),
    rule("cmr_m_highline", {
      name: "Highline — commission on gross",
      scope: "merchant",
      targetId: "mrc_highline",
      targetLabel: "Highline Hotel Group",
      calc: "percent",
      percent: 13,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
      // Highline funds its own promotions, so the platform charges pre-discount.
      basis: "gross",
      effectiveFrom: iso(-180),
      status: "active",
      note: "Merchant funds its own discounts — commission on the gross sale.",
    }),
    rule("cmr_m_desert", {
      name: "Desert Trails — capped commission",
      scope: "merchant",
      targetId: "mrc_desert",
      targetLabel: "Desert Trails Tours",
      calc: "percent_plus_fixed",
      percent: 12,
      fixedFee: 2,
      minFee: 8,
      maxFee: 120,
      basis: "net",
      effectiveFrom: iso(-150),
      status: "active",
      note: "12% + $2 booking fee, floored at $8 and capped at $120.",
    }),
    rule("cmr_m_skyfare", {
      name: "SkyFare — flat ticketing fee",
      scope: "merchant",
      targetId: "mrc_skyfare",
      targetLabel: "SkyFare Consolidator",
      calc: "fixed",
      percent: 0,
      fixedFee: 9,
      minFee: 0,
      maxFee: 0,
      basis: "fixed",
      effectiveFrom: iso(-300),
      status: "active",
      note: "Consolidator fares carry a flat $9 ticketing fee, not a percentage.",
    }),
    rule("cmr_b_globetrek", {
      name: "GlobeTrek — agency margin",
      scope: "b2b_account",
      targetId: "org_globetrek",
      targetLabel: "GlobeTrek Travel",
      calc: "percent",
      percent: 10,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
      basis: "net",
      effectiveFrom: iso(-120),
      status: "active",
      note: "Preferential rate for the platform's largest agency.",
    }),
    rule("cmr_i_standard", {
      name: "Insurance — standard plans",
      scope: "insurance_plan",
      targetId: "ins_standard",
      targetLabel: "Voyager Standard",
      calc: "percent",
      percent: 25,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
      basis: "net",
      effectiveFrom: iso(-90),
      status: "active",
      note: "Platform keeps 25% of the premium on Standard plans.",
    }),
    rule("cmr_v_hotels_q4", {
      name: "Hotels — festive season rate",
      scope: "vertical",
      targetId: "hotels",
      targetLabel: "Hotels",
      calc: "percent",
      percent: 17,
      fixedFee: 0,
      minFee: 0,
      maxFee: 0,
      basis: "net",
      effectiveFrom: iso(110),
      effectiveTo: iso(170),
      status: "scheduled",
      note: "Scheduled uplift over the December peak.",
    }),
  );

  return rows;
}

// ---------------------------------------------------------------------------
// Insurance
// ---------------------------------------------------------------------------

function insuranceProvidersSeed(): InsuranceProvider[] {
  return [
    {
      id: "isp_voyager",
      name: "Voyager Assure (demo)",
      disclaimer: "Demo underwriter — no real cover is provided.",
      country: "Singapore",
      contactEmail: "partners@voyager-assure.demo",
      defaultCommissionPercent: 25,
      status: "active",
      createdAt: iso(-400),
    },
    {
      id: "isp_northgate",
      name: "Northgate Cover (demo)",
      disclaimer: "Demo underwriter — no real cover is provided.",
      country: "United Kingdom",
      contactEmail: "travel@northgate-cover.demo",
      defaultCommissionPercent: 22,
      status: "active",
      createdAt: iso(-320),
    },
  ];
}

function insurancePlansSeed(): InsurancePlan[] {
  const created = iso(-300);
  const updated = iso(-40);
  return [
    {
      id: "ins_basic",
      providerId: "isp_voyager",
      providerName: "Voyager Assure (demo)",
      name: "Voyager Basic",
      tier: "basic",
      summary: "Essential cancellation and baggage cover for short trips.",
      pricingModel: "per_traveler",
      price: 14,
      minPremium: 0,
      maxPremium: 0,
      coverage: [
        { key: "trip_cancellation", label: "Trip cancellation", limit: 1_000 },
        { key: "baggage", label: "Baggage & belongings", limit: 500 },
        { key: "delay", label: "Travel delay", limit: 150, note: "After 6 hours" },
        { key: "medical", label: "Medical expenses", limit: 0 },
        { key: "emergency_assistance", label: "24/7 emergency assistance", limit: 0 },
      ],
      products: [],
      commissionType: "percent",
      commissionValue: 20,
      status: "active",
      createdAt: created,
      updatedAt: updated,
    },
    {
      id: "ins_standard",
      providerId: "isp_voyager",
      providerName: "Voyager Assure (demo)",
      name: "Voyager Standard",
      tier: "standard",
      summary: "Cancellation, medical and baggage cover for most itineraries.",
      pricingModel: "per_traveler",
      price: 26,
      minPremium: 0,
      maxPremium: 0,
      coverage: [
        { key: "trip_cancellation", label: "Trip cancellation", limit: 3_000 },
        { key: "medical", label: "Medical expenses", limit: 50_000 },
        { key: "baggage", label: "Baggage & belongings", limit: 1_500 },
        { key: "delay", label: "Travel delay", limit: 400, note: "After 4 hours" },
        { key: "emergency_assistance", label: "24/7 emergency assistance", limit: 0, note: "Included" },
      ],
      products: [],
      commissionType: "percent",
      commissionValue: 25,
      status: "active",
      createdAt: created,
      updatedAt: updated,
    },
    {
      id: "ins_premium",
      providerId: "isp_northgate",
      providerName: "Northgate Cover (demo)",
      name: "Northgate Premium",
      tier: "premium",
      summary: "Highest limits, cancel-for-any-reason and concierge assistance.",
      pricingModel: "percent_of_trip",
      price: 6,
      minPremium: 45,
      maxPremium: 320,
      coverage: [
        { key: "trip_cancellation", label: "Trip cancellation", limit: 10_000, note: "Any reason" },
        { key: "medical", label: "Medical expenses", limit: 250_000 },
        { key: "baggage", label: "Baggage & belongings", limit: 3_000 },
        { key: "delay", label: "Travel delay", limit: 900, note: "After 2 hours" },
        { key: "emergency_assistance", label: "24/7 emergency assistance", limit: 0, note: "Concierge line" },
      ],
      products: [],
      commissionType: "percent",
      commissionValue: 28,
      status: "active",
      createdAt: created,
      updatedAt: updated,
    },
    {
      id: "ins_visa_denial",
      providerId: "isp_northgate",
      providerName: "Northgate Cover (demo)",
      name: "Visa Refusal Protection",
      tier: "basic",
      summary: "Refunds the application fee if the visa is refused.",
      pricingModel: "per_booking",
      price: 19,
      minPremium: 0,
      maxPremium: 0,
      coverage: [
        { key: "trip_cancellation", label: "Application fee refund", limit: 400 },
        { key: "emergency_assistance", label: "Document helpline", limit: 0 },
      ],
      products: ["visa"],
      commissionType: "fixed",
      commissionValue: 6,
      status: "active",
      createdAt: created,
      updatedAt: updated,
    },
  ];
}

/**
 * Attach policies to a spread of seeded bookings and re-price those bookings
 * so the premium, the provider's share and the platform's margin are on the
 * booking itself — exactly as a live checkout would leave them.
 */
function attachInsurance(
  bookings: Booking[],
  plans: InsurancePlan[],
): InsurancePolicy[] {
  const policies: InsurancePolicy[] = [];
  const eligible = bookings.filter(
    (b) => b.status !== "failed" && b.money.netSale > 0,
  );
  let counter = 0;

  for (const booking of eligible) {
    // ~28% attach rate, chosen by a stable hash of the reference.
    const draw = hash(`ins:${booking.reference}`) % 100;
    if (draw >= 28) continue;

    const plan =
      booking.productKind === "visa"
        ? plans.find((p) => p.id === "ins_visa_denial")!
        : plans[draw % 3];
    const travelers = Math.max(1, booking.travelers.length);

    let listPremium: number;
    if (plan.pricingModel === "per_traveler") listPremium = round(plan.price * travelers);
    else if (plan.pricingModel === "percent_of_trip") {
      listPremium = round(booking.money.netSale * (plan.price / 100));
    } else listPremium = round(plan.price);
    if (plan.minPremium > 0) listPremium = Math.max(listPremium, plan.minPremium);
    if (plan.maxPremium > 0) listPremium = Math.min(listPremium, plan.maxPremium);

    const platformRevenue = round(
      plan.commissionType === "percent"
        ? listPremium * (plan.commissionValue / 100)
        : Math.min(listPremium, plan.commissionValue),
    );
    const providerShare = round(listPremium - platformRevenue);

    // Re-price the booking with the premium folded in as a non-commissionable
    // line, preserving whatever refund position it already had.
    const m = booking.money;
    const refundShare = m.commission > 0 ? m.commissionReversed / m.commission : 0;
    booking.money = priceBooking({
      base: m.base,
      markup: m.markup,
      discount: m.discount,
      platformFundedDiscount: m.platformFundedDiscount,
      commissionRate: m.commissionRate,
      commissionBasis: m.commissionBasis,
      commissionAmount: m.commission,
      commissionRuleId: m.commissionRuleId,
      currency: m.currency,
      taxRate: m.netSale > 0 ? m.taxes / m.netSale : 0,
      feeOverride: m.fees,
      insurance: listPremium,
      insuranceProviderShare: providerShare,
      platformCancellationFee: m.platformCancellationFee,
      refunded: m.refunded > 0 ? round(m.refunded + listPremium * refundShare) : 0,
      commissionReversed: m.commissionReversed,
      insuranceRevenueReversed: round(platformRevenue * refundShare),
    });
    booking.payment.amount = booking.money.total;

    counter += 1;
    const policy: InsurancePolicy = {
      id: `pol_${9_000 + counter}`,
      reference: `POL-${51_000 + counter}`,
      planId: plan.id,
      planName: plan.name,
      tier: plan.tier,
      providerId: plan.providerId,
      providerName: plan.providerName,
      bookingId: booking.id,
      bookingRef: booking.reference,
      customerEmail: booking.customer.email,
      customerName: booking.customer.name,
      currency: booking.money.currency,
      premium: listPremium,
      providerShare,
      platformRevenue,
      travelers,
      startAt: booking.startAt,
      endAt: booking.endAt,
      status: refundShare >= 1 ? "refunded" : "active",
      purchasedAt: booking.createdAt,
      refunded: round(listPremium * refundShare),
      revenueReversed: round(platformRevenue * refundShare),
    };
    if (refundShare > 0) policy.cancelledAt = booking.updatedAt;
    booking.insurancePolicyId = policy.id;
    policies.push(policy);
  }

  return policies.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

function membershipPlansSeed(): MembershipPlan[] {
  const created = iso(-300);
  const updated = iso(-25);
  return [
    {
      id: "mpl_free",
      code: "free",
      name: "StayOra Free",
      tagline: "Everything you need to book and manage a trip.",
      price: 0,
      billingPeriod: "monthly",
      benefits: {
        serviceFeeWaiver: 0,
        memberDiscountPercent: 0,
        memberDiscountCap: 0,
        pointsMultiplier: 1,
        insuranceDiscountPercent: 0,
        freeCancellation: false,
        memberOnlyOffers: false,
        prioritySupport: false,
        perks: ["Standard loyalty earning", "Full booking management"],
      },
      status: "active",
      sortOrder: 0,
      createdAt: created,
      updatedAt: updated,
    },
    {
      id: "mpl_plus",
      code: "plus",
      name: "StayOra Plus",
      tagline: "Member rates and no service fee on every booking.",
      price: 9.99,
      billingPeriod: "monthly",
      compareAtPrice: 14.99,
      benefits: {
        serviceFeeWaiver: 1,
        memberDiscountPercent: 4,
        memberDiscountCap: 60,
        pointsMultiplier: 1.25,
        insuranceDiscountPercent: 10,
        freeCancellation: false,
        memberOnlyOffers: true,
        prioritySupport: false,
        perks: [
          "No platform service fee",
          "4% member discount (up to $60)",
          "1.25× loyalty points",
          "10% off insurance",
          "Member-only offers",
        ],
      },
      status: "active",
      sortOrder: 1,
      createdAt: created,
      updatedAt: updated,
    },
    {
      id: "mpl_premium",
      code: "premium",
      name: "StayOra Premium",
      tagline: "Deeper member rates, free cancellation and priority support.",
      price: 149,
      billingPeriod: "annual",
      compareAtPrice: 239.88,
      benefits: {
        serviceFeeWaiver: 1,
        memberDiscountPercent: 8,
        memberDiscountCap: 150,
        pointsMultiplier: 1.5,
        insuranceDiscountPercent: 25,
        freeCancellation: true,
        memberOnlyOffers: true,
        prioritySupport: true,
        perks: [
          "No platform service fee",
          "8% member discount (up to $150)",
          "1.5× loyalty points",
          "25% off insurance",
          "Free cancellation on eligible rates",
          "Priority support queue",
        ],
      },
      status: "active",
      sortOrder: 2,
      createdAt: created,
      updatedAt: updated,
    },
  ];
}

/** Subscribers across every state, drawn from customers who really booked. */
function membershipsSeed(bookings: Booking[]): MembershipSubscription[] {
  const plans = membershipPlansSeed();
  const plus = plans.find((p) => p.code === "plus")!;
  const premium = plans.find((p) => p.code === "premium")!;

  // Distinct customers, ordered stably by email so the sample never shifts.
  const customers = [
    ...new Map(
      bookings
        .filter((b) => b.segment === "b2c")
        .map((b) => [b.customer.email.toLowerCase(), b.customer]),
    ).values(),
  ].sort((a, b) => a.email.localeCompare(b.email));

  const rows: MembershipSubscription[] = [];
  let counter = 0;

  const add = (
    customer: { name: string; email: string },
    plan: MembershipPlan,
    state: "active" | "cancelled" | "expired",
    startedDaysAgo: number,
  ) => {
    counter += 1;
    const periodDays = plan.billingPeriod === "annual" ? 365 : 30;
    const periodsBilled = state === "expired" ? 1 : Math.max(1, Math.floor(startedDaysAgo / periodDays));
    const renewsIn = state === "active" ? periodDays - (startedDaysAgo % periodDays) : -3;
    rows.push({
      id: `mbs_${9_000 + counter}`,
      reference: `MEM-${61_000 + counter}`,
      customerEmail: customer.email,
      customerName: customer.name,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      status: state,
      billingPeriod: plan.billingPeriod,
      currency: "USD",
      price: plan.price,
      startAt: iso(-startedDaysAgo),
      renewsAt: iso(renewsIn),
      cancelledAt: state === "cancelled" ? iso(-4) : undefined,
      autoRenew: state === "active",
      periodsBilled,
      lifetimeRevenue: round(plan.price * periodsBilled),
      refunded: 0,
    });
  };

  // The demo traveller is a Premium member so the account screens have content.
  add(DEMO_CUSTOMER, premium, "active", 96);

  const pool = customers.filter(
    (c) => c.email.toLowerCase() !== DEMO_CUSTOMER.email.toLowerCase(),
  );
  pool.slice(0, 14).forEach((customer, index) => {
    const plan = index % 3 === 0 ? premium : plus;
    const state: "active" | "cancelled" | "expired" =
      index % 7 === 5 ? "cancelled" : index % 7 === 6 ? "expired" : "active";
    add(customer, plan, state, 20 + index * 13);
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------

function advertisersSeed(): Advertiser[] {
  const rows: Advertiser[] = MERCHANTS.slice(0, 6).map((merchant, index) => ({
    id: `adv_${merchant.id.replace("mrc_", "")}`,
    name: merchant.name,
    type: (["hotel", "resort", "tour_operator", "transport", "hotel", "resort"] as const)[index],
    merchantId: merchant.id,
    contactName: ["Nadia Rahman", "Tom Beaumont", "Silvia Marchetti", "Arjun Mehta", "Chloe Dubois", "Ken Watanabe"][index],
    contactEmail: `marketing@${merchant.id.replace("mrc_", "")}.demo`,
    status: "active",
    createdAt: iso(-260 + index * 9),
  }));

  rows.push(
    {
      id: "adv_voyager",
      name: "Voyager Assure (demo)",
      type: "insurance",
      contactName: "Elena Petrova",
      contactEmail: "growth@voyager-assure.demo",
      status: "active",
      createdAt: iso(-150),
    },
    {
      id: "adv_saffron",
      name: "Saffron & Sea Restaurants",
      type: "restaurant",
      contactName: "Marcus Adeyemi",
      contactEmail: "hello@saffronandsea.demo",
      status: "active",
      createdAt: iso(-110),
    },
    {
      id: "adv_wanderlux",
      name: "WanderLux Travel Brand",
      type: "travel_brand",
      contactName: "Ines Ferreira",
      contactEmail: "media@wanderlux.demo",
      status: "paused",
      createdAt: iso(-70),
    },
  );
  return rows;
}

const CAMPAIGN_BLUEPRINTS: {
  id: string;
  name: string;
  advertiserId: string;
  placement: AdCampaign["placement"];
  pricingModel: AdCampaign["pricingModel"];
  rate: number;
  budget: number;
  startDays: number;
  endDays: number;
  status: AdCampaign["status"];
  verticals: ProductKind[];
  destinations: string[];
  headline: string;
  body: string;
  priority: number;
  /** Delivery: impressions, clicks, conversions, attributed booking value. */
  metrics: [number, number, number, number];
  /** Share of spend already recognised as revenue, 0–1. */
  billedShare: number;
}[] = [
  {
    id: "cmp_azure_home",
    name: "Azure Bay — homepage takeover",
    advertiserId: "adv_azure",
    placement: "homepage_featured",
    pricingModel: "cpm",
    rate: 18,
    budget: 2_500,
    startDays: -60,
    endDays: 30,
    status: "active",
    verticals: ["hotels"],
    destinations: ["Dubai", "Maldives"],
    headline: "Azure Bay — beachfront suites from $210",
    body: "Private beach, sunrise breakfast and late check-out included.",
    priority: 90,
    metrics: [64_000, 1_280, 52, 23_100],
    billedShare: 0.8,
  },
  {
    id: "cmp_palm_search",
    name: "Palm Grove — sponsored search",
    advertiserId: "adv_palm",
    placement: "search_sponsored",
    pricingModel: "cpc",
    rate: 1.4,
    budget: 1_800,
    startDays: -45,
    endDays: 45,
    status: "active",
    verticals: ["resorts", "hotels"],
    destinations: [],
    headline: "Palm Grove Resorts — all-inclusive escapes",
    body: "Four restaurants, two pools and a kids' club on site.",
    priority: 80,
    metrics: [103_000, 780, 42, 18_600],
    billedShare: 0.65,
  },
  {
    id: "cmp_desert_cpa",
    name: "Desert Trails — performance partnership",
    advertiserId: "adv_desert",
    placement: "sponsored_deal",
    pricingModel: "cpa",
    rate: 6,
    budget: 1_200,
    startDays: -90,
    endDays: 20,
    status: "active",
    verticals: ["tours", "activities"],
    destinations: ["Dubai"],
    headline: "Desert Trails — sunrise dune safari",
    body: "Small-group 4×4 safari with breakfast in the dunes.",
    priority: 70,
    metrics: [24_100, 545, 36, 12_400],
    billedShare: 0.5,
  },
  {
    id: "cmp_transit_dest",
    name: "MetroTransit — destination promo",
    advertiserId: "adv_transit",
    placement: "destination_promo",
    pricingModel: "flat",
    rate: 900,
    budget: 900,
    startDays: -120,
    endDays: -20,
    status: "completed",
    verticals: ["transport"],
    destinations: ["Bangkok", "Singapore"],
    headline: "MetroTransit — airport transfers from $18",
    body: "Fixed fares, flight tracking and a 60-minute free wait.",
    priority: 60,
    metrics: [37_000, 480, 24, 4_600],
    billedShare: 1,
  },
  {
    id: "cmp_voyager_insurance",
    name: "Voyager Assure — checkout attach",
    advertiserId: "adv_voyager",
    placement: "campaign_card",
    pricingModel: "cpm",
    rate: 12,
    budget: 800,
    startDays: -30,
    endDays: 60,
    status: "active",
    verticals: [],
    destinations: [],
    headline: "Cover your trip from $14",
    body: "Demo cover for cancellation, medical and baggage.",
    priority: 50,
    metrics: [26_000, 260, 15, 0],
    billedShare: 0.4,
  },
  {
    id: "cmp_highline_category",
    name: "Highline — category feature",
    advertiserId: "adv_highline",
    placement: "category_featured",
    pricingModel: "flat",
    rate: 640,
    budget: 640,
    startDays: 10,
    endDays: 70,
    status: "scheduled",
    verticals: ["hotels"],
    destinations: ["London", "Istanbul"],
    headline: "Highline Hotel Group — city stays reimagined",
    body: "Rooftop bars, late check-out and a members' rate.",
    priority: 55,
    metrics: [0, 0, 0, 0],
    billedShare: 0,
  },
  {
    id: "cmp_saffron_banner",
    name: "Saffron & Sea — dining banner",
    advertiserId: "adv_saffron",
    placement: "banner",
    pricingModel: "cpc",
    rate: 0.9,
    budget: 500,
    startDays: -25,
    endDays: 35,
    status: "paused",
    verticals: [],
    destinations: ["Dubai", "Istanbul"],
    headline: "Saffron & Sea — waterfront dining",
    body: "Chef's table and a complimentary welcome mezze.",
    priority: 40,
    metrics: [22_000, 180, 6, 1_300],
    billedShare: 0.3,
  },
  {
    id: "cmp_wanderlux_review",
    name: "WanderLux — brand launch",
    advertiserId: "adv_wanderlux",
    placement: "homepage_featured",
    pricingModel: "cpm",
    rate: 22,
    budget: 1_400,
    startDays: 5,
    endDays: 95,
    status: "pending_review",
    verticals: [],
    destinations: [],
    headline: "WanderLux — the slow travel collection",
    body: "Hand-picked stays for travellers who stay longer.",
    priority: 45,
    metrics: [0, 0, 0, 0],
    billedShare: 0,
  },
];

function adCampaignsSeed(): AdCampaign[] {
  return CAMPAIGN_BLUEPRINTS.map((blueprint, index) => {
    const [impressions, clicks, conversions, attributedValue] = blueprint.metrics;
    return {
      id: blueprint.id,
      reference: `ADS-${71_000 + index + 1}`,
      name: blueprint.name,
      advertiserId: blueprint.advertiserId,
      advertiserName:
        advertisersSeed().find((a) => a.id === blueprint.advertiserId)?.name ??
        "Unknown advertiser",
      placement: blueprint.placement,
      pricingModel: blueprint.pricingModel,
      rate: blueprint.rate,
      budget: blueprint.budget,
      currency: "USD",
      startAt: iso(blueprint.startDays),
      endAt: iso(blueprint.endDays),
      status: blueprint.status,
      targetVerticals: blueprint.verticals,
      targetDestinations: blueprint.destinations,
      creativeHeadline: blueprint.headline,
      creativeBody: blueprint.body,
      metrics: { impressions, clicks, conversions, attributedValue },
      billed: 0, // set below, once spend can be computed from the finished row
      priority: blueprint.priority,
      createdAt: iso(blueprint.startDays - 14),
      updatedAt: iso(Math.min(0, blueprint.endDays)),
      reviewedBy: blueprint.status === "pending_review" ? undefined : "Priya Raman",
    } satisfies AdCampaign;
  }).map((campaign, index) => {
    const blueprint = CAMPAIGN_BLUEPRINTS[index];
    const spend = spendOf(campaign);
    return { ...campaign, billed: round(spend * blueprint.billedShare) };
  });
}

/** Local copy of the spend formula — the seed can't import the service safely. */
function spendOf(campaign: AdCampaign): number {
  const { metrics: m, rate } = campaign;
  let raw: number;
  switch (campaign.pricingModel) {
    case "cpc":
      raw = m.clicks * rate;
      break;
    case "cpm":
      raw = (m.impressions / 1_000) * rate;
      break;
    case "cpa":
      raw = m.attributedValue * (rate / 100);
      break;
    default:
      raw = m.impressions > 0 || campaign.status === "completed" ? rate : 0;
  }
  return round(Math.min(campaign.budget, Math.max(0, raw)));
}

// ---------------------------------------------------------------------------
// Revenue-management rules
// ---------------------------------------------------------------------------

function pricingRulesSeed(): PricingRule[] {
  const base = {
    threshold: 0,
    unitsRemaining: 0,
    adjustmentPercent: 0,
    minStay: 1,
    weekdays: [] as number[],
    status: "active" as const,
    createdAt: iso(-150),
    updatedAt: iso(-20),
    updatedBy: "Priya Raman",
  };
  return [
    {
      ...base,
      id: "prl_high_demand",
      name: "High demand uplift",
      kind: "high_demand",
      threshold: 0.85,
      adjustmentPercent: 12,
      priority: 90,
      note: "Above 85% occupancy, raise the rate 12%.",
    },
    {
      ...base,
      id: "prl_low_demand",
      name: "Low demand stimulus",
      kind: "low_demand",
      threshold: 0.25,
      adjustmentPercent: -10,
      priority: 80,
      note: "Below 25% occupancy, discount 10% to drive pickup.",
    },
    {
      ...base,
      id: "prl_weekend",
      name: "Weekend premium",
      kind: "weekend",
      adjustmentPercent: 8,
      weekdays: [5, 6],
      priority: 60,
      note: "Friday and Saturday nights carry an 8% premium.",
    },
    {
      ...base,
      id: "prl_last_room",
      name: "Last-room availability",
      kind: "last_room",
      unitsRemaining: 2,
      adjustmentPercent: 9,
      priority: 70,
      note: "With two or fewer rooms left, raise the rate 9%.",
    },
    {
      ...base,
      id: "prl_min_stay",
      name: "Peak minimum stay",
      kind: "min_stay",
      threshold: 0.8,
      minStay: 2,
      priority: 50,
      note: "Require two nights once a date is 80% full.",
    },
    {
      ...base,
      id: "prl_stop_sell",
      name: "Protect the last units",
      kind: "stop_sell",
      threshold: 0.97,
      priority: 40,
      status: "paused",
      note: "Paused — close out only when a date is effectively full.",
    },
  ];
}

// ---------------------------------------------------------------------------
// B2B sub-users
// ---------------------------------------------------------------------------

const SUB_USER_NAMES: Record<string, [string, string][]> = {
  org_globetrek: [
    ["Rezaul Karim", "owner"],
    ["Nusrat Jahan", "agent"],
    ["Imran Hossain", "agent"],
    ["Farhana Akter", "finance"],
  ],
  org_northwind: [
    ["Helena Cross", "owner"],
    ["Daniel Okafor", "agent"],
    ["Priya Nair", "finance"],
  ],
  org_sunpath: [
    ["Mariam Al Suwaidi", "owner"],
    ["Yusuf Haddad", "agent"],
  ],
  org_meridian: [
    ["Sanjay Iyer", "owner"],
    ["Kavya Menon", "viewer"],
  ],
  org_atlas: [
    ["Wei Ling Tan", "owner"],
    ["Marcus Lim", "finance"],
  ],
};

function subUsersSeed(): B2BSubUser[] {
  const rows: B2BSubUser[] = [];
  let counter = 0;
  for (const account of B2B_ACCOUNTS) {
    const people = SUB_USER_NAMES[account.id] ?? [];
    people.forEach(([name, role], index) => {
      counter += 1;
      const handle = name.toLowerCase().replace(/[^a-z]+/g, ".");
      rows.push({
        id: `bsu_${9_000 + counter}`,
        accountId: account.id,
        name,
        email: `${handle}@${account.code.toLowerCase().split("-")[0]}.example`,
        role: role as B2BSubUser["role"],
        // Owners and finance book against the whole account limit; agents are
        // capped, which is the control an agency principal actually wants.
        bookingLimit: role === "agent" ? Math.round(account.creditLimit / 10) : 0,
        status: account.status === "suspended" && index > 0 ? "suspended" : "active",
        createdAt: account.createdAt,
      });
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Stored revenue entries
// ---------------------------------------------------------------------------

/**
 * Membership, advertising and B2B-subscription revenue.
 *
 * Booking commission, service fees and insurance are *not* here: those are
 * derived from the booking ledger by `revenueLedger()`, so storing them would
 * double-count them.
 */
function revenueEntriesSeed(
  memberships: MembershipSubscription[],
  campaigns: AdCampaign[],
): RevenueEntry[] {
  const rows: RevenueEntry[] = [];
  let counter = 0;
  const next = () => {
    counter += 1;
    return { id: `rev_${9_000 + counter}`, reference: `REV-${81_000 + counter}` };
  };

  // --- membership ---------------------------------------------------------
  for (const sub of memberships) {
    const periodDays = sub.billingPeriod === "annual" ? 365 : 30;
    const startMs = new Date(sub.startAt).getTime();
    for (let period = 0; period < sub.periodsBilled; period += 1) {
      const at = new Date(startMs + period * periodDays * DAY).toISOString();
      if (new Date(at).getTime() > NOW_MS) break;
      const ids = next();
      rows.push({
        ...ids,
        at,
        source: "membership",
        status: sub.status === "cancelled" && period === sub.periodsBilled - 1 ? "adjusted" : "finalized",
        currency: sub.currency,
        label: `${sub.planName} — ${sub.billingPeriod === "annual" ? "annual" : "monthly"} subscription`,
        grossValue: sub.price,
        partnerShare: 0,
        amount: sub.price,
        reversed: 0,
        net: sub.price,
        customerEmail: sub.customerEmail,
        customerName: sub.customerName,
        planId: sub.planId,
      });
    }
  }

  // --- advertising --------------------------------------------------------
  for (const campaign of campaigns) {
    if (campaign.billed <= 0) continue;
    const ids = next();
    rows.push({
      ...ids,
      at: campaign.updatedAt,
      source: "advertising",
      status: campaign.status === "completed" ? "finalized" : "accrued",
      currency: campaign.currency,
      label: `${campaign.name} — ${campaign.pricingModel.toUpperCase()} billing`,
      grossValue: campaign.billed,
      partnerShare: 0,
      amount: campaign.billed,
      reversed: 0,
      net: campaign.billed,
      campaignId: campaign.id,
      advertiserId: campaign.advertiserId,
      merchantId: campaign.advertiserId.startsWith("adv_")
        ? `mrc_${campaign.advertiserId.slice(4)}`
        : undefined,
      note: `Recognised against ${campaign.reference}.`,
    });
  }

  // --- B2B subscriptions --------------------------------------------------
  for (const account of B2B_ACCOUNTS) {
    const fee = account.id === "org_globetrek" ? 249 : account.id === "org_meridian" ? 99 : 0;
    if (fee <= 0) continue;
    for (let quarter = 0; quarter < 3; quarter += 1) {
      const ids = next();
      rows.push({
        ...ids,
        at: iso(-90 * (quarter + 1)),
        source: "b2b_subscription",
        status: "finalized",
        currency: account.currency,
        label: `${account.name} — premium B2B access`,
        grossValue: fee,
        partnerShare: 0,
        amount: fee,
        reversed: 0,
        net: fee,
        organizationId: account.id,
        organizationName: account.name,
      });
    }
  }

  // --- an operator adjustment, so the shape is demonstrable ---------------
  const adjustment = next();
  rows.push({
    ...adjustment,
    at: iso(-12),
    source: "adjustment",
    status: "finalized",
    currency: "USD",
    label: "Goodwill credit — delayed settlement, Marina Living",
    grossValue: 0,
    partnerShare: 0,
    amount: -420,
    reversed: 0,
    net: -420,
    merchantId: "mrc_marina",
    merchantName: "Marina Living Apartments",
    note: "Approved by finance after a two-week settlement delay.",
  });

  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface MonetizationSeed {
  commissionRules: CommissionRule[];
  revenueEntries: RevenueEntry[];
  insuranceProviders: InsuranceProvider[];
  insurancePlans: InsurancePlan[];
  insurancePolicies: InsurancePolicy[];
  membershipPlans: MembershipPlan[];
  memberships: MembershipSubscription[];
  advertisers: Advertiser[];
  adCampaigns: AdCampaign[];
  pricingRules: PricingRule[];
  b2bSubUsers: B2BSubUser[];
}

/**
 * Build every monetization collection. Mutates `bookings` in place to attach
 * insurance policies — the same pattern `buildExtras` uses, and the reason both
 * run against the store's *clone* of the seed rather than the frozen original.
 */
export function buildMonetization(bookings: Booking[]): MonetizationSeed {
  const insurancePlans = insurancePlansSeed();
  const insurancePolicies = attachInsurance(bookings, insurancePlans);
  const membershipPlans = membershipPlansSeed();
  const memberships = membershipsSeed(bookings);
  const advertisers = advertisersSeed();
  const adCampaigns = adCampaignsSeed();

  return {
    commissionRules: commissionRulesSeed(),
    revenueEntries: revenueEntriesSeed(memberships, adCampaigns),
    insuranceProviders: insuranceProvidersSeed(),
    insurancePlans,
    insurancePolicies,
    membershipPlans,
    memberships,
    advertisers,
    adCampaigns,
    pricingRules: pricingRulesSeed(),
    b2bSubUsers: subUsersSeed(),
  };
}
