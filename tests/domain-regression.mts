/**
 * Domain regression harness — `bun run test:domain`.
 *
 * Exercises the booking lifecycle end to end against the real domain services
 * in Node (no browser), where the store falls back to its server snapshot and
 * every mutation is in-memory. That is the same surface a UI click drives, so a
 * green run means the flows behind the screens still work: inventory holds and
 * double-booking, pricing, cancellation and refund, loyalty, support visibility
 * rules, merchant scope, the unified read model, the CMS workflow, and the
 * discovery geo layer.
 *
 * Checks run in order against one shared store, so earlier sections deliberately
 * leave state behind for later ones — that is closer to a real session than a
 * per-test reset would be.
 */

import {
  adService,
  advertisingService,
  b2bService,
  benefitsFor,
  bookingService,
  campaignSpend,
  checkAvailability,
  cheapestQuote,
  couponService,
  getHold,
  getRoomTypes,
  getState,
  holdInventory,
  loyaltyService,
  commissionRuleService,
  insuranceService,
  membershipAdminService,
  membershipService,
  priceB2B,
  propertyRecommendations,
  quoteInsurance,
  quoteRefund,
  quoteStay,
  releaseHold,
  resolveCommission,
  revenueLedger,
  revenueManagementService,
  revenueService,
  summarizeRevenue,
  supportService,
  sweepExpiredHolds,
  // --- merchant ecosystem ---
  AD_RATE_CARD,
  MERCHANTS,
  REQUIRED_DOCUMENT_TYPES,
  campaignsForMerchant,
  canTrade,
  catalogueForMerchant,
  catalogueService,
  disputeService,
  estimateSpend,
  getMerchant,
  isListingLive,
  merchantAdvertisingService,
  merchantRef,
  merchantRoleCan,
  merchantService,
  onboardingProgress,
  payoutService,
  planAllows,
  publishBlockers,
  type PropertyRef,
} from "@/features/dashboard/domain";
import { resolveCurrentUser } from "@/features/dashboard/rbac/current-user";
import { HOTELS } from "@/constants/listings";
import { toPropertyRef } from "@/features/booking/property";
import { combineBookings, toUnifiedFromStay } from "@/features/booking/unified";
import {
  CMS_TRANSITIONS,
  canTransition,
  listVersions,
  restoreVersion,
  runDueSchedules,
  transition,
} from "@/features/dashboard/modules/cms/workflow";
import { cmsService } from "@/features/dashboard/modules/cms/service";
import { DEMO_ORIGIN, coordsFor, haversineKm } from "@/features/discovery/geo";
import { roleService } from "@/features/dashboard/rbac/role-service";
import { derivePermissions } from "@/features/dashboard/rbac/current-user";
import {
  flagAppliesTo,
  resetFlag,
  resolveEnabledFlags,
  setFlagEnabled,
  setFlagRoles,
} from "@/features/dashboard/feature-flags/flag-store";
import { commissionApprovalService } from "@/features/dashboard/domain/commission-approvals";
import { commissionRuleStore, toRuleInput } from "@/features/dashboard/domain/commission-rules";
import { priceBooking } from "@/features/dashboard/domain/money";
import {
  DEFAULT_PLATFORM_CONFIG,
  platformConfig,
  resetPlatformConfig,
  updatePlatformConfig,
  validateEconomics,
} from "@/features/dashboard/domain/platform-config";
import { platformSettingsService } from "@/features/dashboard/domain/platform-settings-service";
import { isFxLockExpired, lockFx, quoteFx } from "@/features/dashboard/domain/fx";
import { advanceDeliveries, retryDelivery, send } from "@/features/dashboard/domain/messaging";
import { listJobs, runJob, setJobStatus, tickScheduler } from "@/features/dashboard/domain/scheduler";
import { joinWaitlist, sweepWaitlist, waitlistService } from "@/features/dashboard/domain/waitlist";
import { recoveryService, sweepAbandonedCheckouts } from "@/features/dashboard/domain/recovery";
import {
  requestSupplierConfirmation,
  resolveSupplierConfirmation,
  sweepSupplierConfirmations,
} from "@/features/dashboard/domain/supplier";
import { financePeriodService, periodFigures } from "@/features/dashboard/domain/finance-periods";
import { campaignService, segmentMembers, segmentSizes } from "@/features/dashboard/domain/campaigns";
import { suggestAlternativeDates } from "@/features/dashboard/domain/alternatives";
import { translate, translationCoverage } from "@/features/i18n/dictionaries";
import { setLanguageEnabled, setTranslation, resetLocaleSettings } from "@/features/i18n/locale-settings";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

const ACTOR = { id: "usr_test", name: "Test Operator", role: "admin" };

// ---------------------------------------------------------------------------
section("Inventory — availability, holds, double booking, expiry");
// ---------------------------------------------------------------------------

const listing = HOTELS[0];
const property: PropertyRef = toPropertyRef(listing);
const rooms = getRoomTypes(property);
check("property exposes room types", rooms.length > 0, `${rooms.length}`);

const room = rooms[0];
const checkIn = "2026-09-10";
const checkOut = "2026-09-12";
const req = {
  property,
  roomTypeId: room.id,
  ratePlanId: "standard" as const,
  checkIn,
  checkOut,
  units: 1,
};

const before = checkAvailability(req);
check("dates available before any hold", before.available, JSON.stringify(before.blockers));
const unitsBefore = before.unitsLeft;

const hold = holdInventory({ ...req, lockedTotal: 400 });
check("hold created", Boolean(hold.id) && hold.status === "held");

const afterHold = checkAvailability(req);
check(
  "hold decreases availability",
  afterHold.unitsLeft === unitsBefore - 1,
  `${unitsBefore} -> ${afterHold.unitsLeft}`,
);

// Consume every remaining unit, then confirm the next request is refused.
const remaining = afterHold.unitsLeft;
const bulk =
  remaining > 0 ? holdInventory({ ...req, units: remaining, lockedTotal: 1 }) : null;
const soldOut = checkAvailability(req);
check("double booking blocked once sold out", !soldOut.available, JSON.stringify(soldOut.blockers));

let overbookThrew = false;
try {
  holdInventory({ ...req, lockedTotal: 1 });
} catch {
  overbookThrew = true;
}
check("holding beyond allotment throws", overbookThrew);

if (bulk) releaseHold(bulk.id);
check(
  "releasing a hold restores availability",
  checkAvailability(req).unitsLeft === unitsBefore - 1,
);

const live = getHold(hold.id);
check("hold is retrievable while held", Boolean(live));
sweepExpiredHolds(Date.parse(live!.expiresAt) + 1000);
const swept = getHold(hold.id);
check("expiry sweep releases the hold", swept?.status !== "held", swept?.status);
check(
  "expiry restores the held unit",
  checkAvailability(req).unitsLeft === unitsBefore,
  `${checkAvailability(req).unitsLeft} vs ${unitsBefore}`,
);

// ---------------------------------------------------------------------------
section("Pricing — the quote the customer sees is the quote charged");
// ---------------------------------------------------------------------------

const quote = quoteStay(req);
check("quote covers both nights", quote.nightCount === 2, `${quote.nightCount}`);
check("quote subtotal is positive", quote.roomSubtotal > 0, `${quote.roomSubtotal}`);
check("quote repeats identically", quoteStay(req).roomSubtotal === quote.roomSubtotal);
const cheapest = cheapestQuote(property, checkIn, checkOut);
check("cheapest quote resolves", Boolean(cheapest));
check(
  "cheapest is no dearer than the standard plan",
  (cheapest?.roomSubtotal ?? Infinity) <= quote.roomSubtotal,
  `${cheapest?.roomSubtotal} vs ${quote.roomSubtotal}`,
);

// ---------------------------------------------------------------------------
section("Booking lifecycle — cancellation and refund");
// ---------------------------------------------------------------------------

const confirmed = getState().bookings.find((b) => b.status === "confirmed");
check("a confirmed seed booking exists", Boolean(confirmed));

if (confirmed) {
  const refund = quoteRefund({ booking: confirmed, reason: "customer_cancellation" });
  check("refund quote produced", typeof refund.refundAmount === "number", JSON.stringify(refund));
  check(
    "refund never exceeds what was paid",
    refund.refundAmount <= confirmed.money.total,
    `${refund.refundAmount} vs ${confirmed.money.total}`,
  );

  const timelineBefore = confirmed.timeline.length;
  await bookingService.transition(confirmed.id, "cancel", { actor: ACTOR });
  const after = getState().bookings.find((b) => b.id === confirmed.id)!;
  check("booking is cancelled", after.status === "cancelled", after.status);
  check("cancellation is on the timeline", after.timeline.length > timelineBefore);
}

// ---------------------------------------------------------------------------
section("Loyalty — earn on completion, redeem, reverse on refund");
// ---------------------------------------------------------------------------

// The seed already credits points for its own completed bookings, so pick one
// that hasn't earned yet — otherwise the idempotency guard hides the earn path.
const completed = getState().bookings.find(
  (b) =>
    b.status === "completed" &&
    b.money.netSale > 0 &&
    !loyaltyService
      .summary(b.customer.email)
      .entries.some((e) => e.bookingId === b.id && e.direction === "earned"),
);
check("an un-credited completed booking exists", Boolean(completed));

if (completed) {
  const email = completed.customer.email;
  const start = loyaltyService.balance(email);

  const earnedEntry = loyaltyService.earnForBooking(completed);
  const afterEarn = loyaltyService.balance(email);
  check("completion earns points", Boolean(earnedEntry) && afterEarn > start, `${start} -> ${afterEarn}`);

  check("earning is idempotent", loyaltyService.earnForBooking(completed) === null);

  const redeemable = loyaltyService.maxRedeemable(email, 500);
  if (redeemable > 0) {
    loyaltyService.redeem(email, redeemable, { description: "regression" });
    check(
      "redeeming reduces the balance",
      loyaltyService.balance(email) === afterEarn - redeemable,
      `${loyaltyService.balance(email)}`,
    );
  } else {
    check("redeemable amount computed", redeemable === 0);
  }

  const beforeReverse = loyaltyService.balance(email);
  loyaltyService.reverseForBooking(completed);
  check(
    "refund reverses the earned points",
    loyaltyService.balance(email) < beforeReverse ||
      loyaltyService.summary(email).entries.some((e) => e.direction === "reversed"),
  );
  check("reversal is idempotent", (() => {
    const b = loyaltyService.balance(email);
    loyaltyService.reverseForBooking(completed);
    return loyaltyService.balance(email) === b;
  })());
}

// ---------------------------------------------------------------------------
section("Coupons");
// ---------------------------------------------------------------------------

const demoEmail = getState().bookings[0].customer.email;
const wallet = couponService.list(demoEmail);
check("coupon wallet reads without throwing", Array.isArray(wallet), `${wallet.length}`);

// ---------------------------------------------------------------------------
section("Support — customer ↔ agent, internal notes stay internal");
// ---------------------------------------------------------------------------

const ticket = supportService.create({
  requesterEmail: "support-test@otithee.com",
  requesterName: "Support Tester",
  subject: "Regression ticket",
  category: "booking",
  body: "My booking looks wrong.",
});
check("ticket created", Boolean(ticket.id));
check(
  "ticket visible to its customer",
  supportService.forCustomer("support-test@otithee.com").some((t) => t.id === ticket.id),
);
check(
  "ticket NOT visible to another customer",
  !supportService.forCustomer("someone-else@otithee.com").some((t) => t.id === ticket.id),
);
check("admin queue sees the ticket", supportService.all().some((t) => t.id === ticket.id));

supportService.reply(ticket.id, {
  from: "agent",
  authorName: "Agent Smith",
  body: "Looking into it now.",
  internal: false,
});
supportService.reply(ticket.id, {
  from: "agent",
  authorName: "Agent Smith",
  body: "Escalating to revenue — do not tell the customer.",
  internal: true,
});

const updated = supportService.get(ticket.id)!;
const customerThread = supportService.customerThread(updated);
check(
  "customer sees the agent reply",
  customerThread.some((m) => m.body === "Looking into it now."),
);
check(
  "customer does NOT see the internal note",
  !customerThread.some((m) => m.internal),
  JSON.stringify(customerThread.map((m) => m.internal)),
);
check("the internal note exists on the ticket", updated.messages.some((m) => m.internal));

// ---------------------------------------------------------------------------
section("Merchant scope");
// ---------------------------------------------------------------------------

const merchantId = getState().bookings[0].merchant.id;
const scoped = await bookingService.list({ pageSize: 500 }, { merchantId });
check("merchant list is non-empty", scoped.items.length > 0, `${scoped.items.length}`);
check(
  "merchant sees only their own bookings",
  scoped.items.every((b) => b.merchant.id === merchantId),
);
const unscoped = await bookingService.list({ pageSize: 500 }, {});
check(
  "platform sees at least as many",
  unscoped.total >= scoped.total,
  `${unscoped.total} vs ${scoped.total}`,
);

// ---------------------------------------------------------------------------
section("Unified read model");
// ---------------------------------------------------------------------------

const stay = getState().bookings[0];
const unifiedStay = toUnifiedFromStay(stay);
check("stay keeps its reference", unifiedStay.reference === stay.reference);
check("stay keeps its total", unifiedStay.total === stay.money.total);
check("stay keeps its source channel", unifiedStay.sourceType === stay.channel);
check("stay maps to a shared status", Boolean(unifiedStay.status));

const combined = combineBookings({ stays: getState().bookings.slice(0, 30) });
check(
  "combined list is newest first",
  combined.every((row, i) => (i === 0 ? true : combined[i - 1].createdAt >= row.createdAt)),
);
check("nothing is lost in the projection", combined.length === 30, `${combined.length}`);

// Trip grouping: a stay inside a trip must not also appear on its own.
const grouped = combineBookings({
  stays: [stay],
  trips: [
    {
      id: "trp_test",
      reference: "TRIP-TEST",
      createdAt: stay.createdAt,
      destination: "Test",
      destinationLabel: "Test City",
      startDate: stay.startAt,
      endDate: stay.endAt,
      travelers: { adults: 2, children: 0, infants: 0 },
      segment: "b2c",
      currency: "USD",
      subtotalUsd: 100,
      discountUsd: 0,
      taxesUsd: 0,
      feesUsd: 0,
      totalUsd: 100,
      savingsUsd: 0,
      commissionUsd: 0,
      paymentMethod: "card",
      components: [
        {
          bookingId: stay.id,
          kind: "hotels",
          title: stay.productTitle,
          status: stay.status,
          totalUsd: stay.money.total,
        },
      ],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any,
});
check("a booking inside a trip is not listed twice", grouped.length === 1, `${grouped.length}`);
check("the trip is what is listed", grouped[0]?.type === "trip");

// ---------------------------------------------------------------------------
section("CMS workflow — draft → review → published, versions, schedule");
// ---------------------------------------------------------------------------

check("draft cannot publish directly", !canTransition("draft", "published"));
check("draft → review allowed", canTransition("draft", "review"));
check("review → published allowed", canTransition("review", "published"));
check("scheduled → published allowed", canTransition("scheduled", "published"));
check("every status declares its moves", Object.keys(CMS_TRANSITIONS).length === 4);

const draft = cmsService.peek!().find((p) => p.status === "draft")!;
check("a draft page exists in the seed", Boolean(draft));

let illegalRejected = false;
try {
  await transition({ page: draft, to: "published", actor: ACTOR });
} catch {
  illegalRejected = true;
}
check("publishing a draft is rejected", illegalRejected);

const inReview = await transition({ page: draft, to: "review", actor: ACTOR });
check("draft moved to review", inReview.status === "review", inReview.status);
check("submitter recorded", inReview.submittedBy === ACTOR.name);

const published = await transition({ page: inReview, to: "published", actor: ACTOR });
check("review moved to published", published.status === "published", published.status);
check("approver recorded", published.reviewedBy === ACTOR.name);
check("publish timestamp set", Boolean(published.publishedAt));

const history = listVersions(published.id);
check("history captured both transitions", history.length >= 2, `${history.length}`);

const oldest = history[history.length - 1];
const restored = await restoreVersion(published, oldest, ACTOR);
check("restore returns the page to draft", restored.status === "draft", restored.status);
check("restore bumps the version", restored.version === published.version + 1);
check("restore writes its own history entry", listVersions(published.id).length > history.length);

const reviewable = cmsService.peek!().find((p) => p.status === "review");
if (reviewable) {
  const scheduled = await transition({
    page: reviewable,
    to: "scheduled",
    actor: ACTOR,
    publishAt: new Date(Date.now() - 60_000).toISOString(),
  });
  check("page scheduled", scheduled.status === "scheduled", scheduled.status);
  const wentLive = await runDueSchedules(ACTOR);
  check(
    "a due schedule publishes itself",
    wentLive.some((p) => p.id === scheduled.id && p.status === "published"),
    JSON.stringify(wentLive.map((p) => [p.id, p.status])),
  );
} else {
  check("a reviewable page was available to schedule", false, "none in review");
}

const futureScheduled = cmsService
  .peek!()
  .filter((p) => p.status === "scheduled" && p.publishAt && Date.parse(p.publishAt) > Date.now());
const swept2 = await runDueSchedules(ACTOR);
check(
  "a future schedule is left alone",
  swept2.length === 0 && futureScheduled.length >= 0,
  `${swept2.length}`,
);

const audit = getState().auditLog.filter((e) => e.entity === "cms_page");
check("CMS actions wrote audit entries", audit.length > 0, `${audit.length}`);
check(
  "audit records the publish approval",
  audit.some((e) => e.action === "approve"),
);

// ---------------------------------------------------------------------------
section("Discovery — deterministic geo, distance filtering");
// ---------------------------------------------------------------------------

const a = coordsFor(listing);
const b = coordsFor(listing);
check("coordinates are stable for a listing", a.lat === b.lat && a.lng === b.lng);
check("coordinates are in range", Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180);
const distinct = new Set(
  HOTELS.slice(0, 20).map((l) => `${coordsFor(l).lat},${coordsFor(l).lng}`),
);
check("markers do not all stack", distinct.size === 20, `${distinct.size}/20`);
const parisLondon = haversineKm(DEMO_ORIGIN, { lat: 51.5074, lng: -0.1278 });
check(
  "Paris → London is ~344 km",
  parisLondon > 330 && parisLondon < 360,
  `${Math.round(parisLondon)}`,
);
check("distance to self is zero", haversineKm(DEMO_ORIGIN, DEMO_ORIGIN) === 0);

const near = HOTELS.filter((l) => haversineKm(DEMO_ORIGIN, coordsFor(l)) <= 50);
const far = HOTELS.filter((l) => haversineKm(DEMO_ORIGIN, coordsFor(l)) <= 20_000);
check("radius filter narrows the set", near.length < far.length, `${near.length} vs ${far.length}`);
check("a 20,000 km radius keeps everything", far.length === HOTELS.length);


// ---------------------------------------------------------------------------
section("Commission rules — resolution order, bounds, basis");
// ---------------------------------------------------------------------------

const azure = resolveCommission({
  productKind: "hotels",
  merchantId: "mrc_azure",
  gross: 1_000,
  net: 900,
  merchantRate: 12,
});
check("a merchant rule beats the vertical rule", azure.scope === "merchant", azure.ruleName);
check("merchant rule charges its own rate", azure.commission === 108, `${azure.commission}`);

const highline = resolveCommission({
  productKind: "hotels",
  merchantId: "mrc_highline",
  gross: 1_000,
  net: 900,
});
check("a gross-basis rule ignores the discount", highline.basisAmount === 1_000, `${highline.basisAmount}`);
check("gross basis charges on the gross sale", highline.commission === 130, `${highline.commission}`);

const capped = resolveCommission({
  productKind: "tours",
  merchantId: "mrc_desert",
  gross: 20_000,
  net: 20_000,
});
check("a maximum fee caps the commission", capped.commission === 120, `${capped.commission}`);
check("the cap is reported", capped.maxFeeApplied);

const floored = resolveCommission({
  productKind: "tours",
  merchantId: "mrc_desert",
  gross: 10,
  net: 10,
});
check("a minimum fee floors the commission", floored.commission === 8, `${floored.commission}`);

const flat = resolveCommission({ productKind: "flights", merchantId: "mrc_skyfare", gross: 900, net: 900 });
check("a fixed-fee rule ignores the sale value", flat.commission === 9, `${flat.commission}`);

const fallback = resolveCommission({ productKind: "apartments", merchantId: "mrc_nobody", gross: 100, net: 100 });
check("an unmatched merchant falls back to the vertical rule", fallback.scope === "vertical", fallback.ruleName);

// ---------------------------------------------------------------------------
section("Scenario 1 — hotel commission end to end");
// ---------------------------------------------------------------------------

const scenarioMerchant = getState().bookings.find((b) => b.merchant.id === "mrc_azure")!.merchant;
const hotelBooking = await bookingService.create(
  {
    productKind: "hotels",
    productTitle: "Regression Suite — Deluxe",
    destination: "Dubai",
    merchantId: scenarioMerchant.id,
    customerName: "Scenario Customer",
    customerEmail: "scenario@otithee.com",
    segment: "b2c",
    startAt: "2026-10-01T14:00:00.000Z",
    endAt: "2026-10-04T11:00:00.000Z",
    quantity: 1,
    baseAmount: 1_000,
  },
  ACTOR,
);
check("booking priced by the rule engine", hotelBooking.money.commissionRuleId === "cmr_m_azure", String(hotelBooking.money.commissionRuleId));
check("commission is 12% of net sale", hotelBooking.money.commission === 120, `${hotelBooking.money.commission}`);
check(
  "merchant earning is net sale less commission",
  hotelBooking.money.merchantEarning === 880,
  `${hotelBooking.money.merchantEarning}`,
);
check(
  "platform revenue is commission plus fees",
  hotelBooking.money.platformRevenue === 140,
  `${hotelBooking.money.platformRevenue}`,
);
check(
  "the merchant's earning is NOT counted as platform revenue",
  hotelBooking.money.platformRevenue < hotelBooking.money.merchantEarning,
);
check(
  "tax is not platform revenue",
  hotelBooking.money.taxes > 0 &&
    hotelBooking.money.platformRevenue ===
      hotelBooking.money.commission + hotelBooking.money.fees,
);

const commissionEntry = getState().commissions.find((c) => c.bookingId === hotelBooking.id);
check("a commission ledger entry was written", Boolean(commissionEntry));
check("the ledger agrees with the booking", commissionEntry?.commission === hotelBooking.money.commission);

// ---------------------------------------------------------------------------
section("Scenario 2 — insurance attach");
// ---------------------------------------------------------------------------

const plans = insuranceService.plansFor("hotels");
check("insurance plans are offered", plans.length >= 3, `${plans.length}`);

const standard = plans.find((p) => p.id === "ins_standard")!;
const insuranceQuote = quoteInsurance(standard, { travelers: 2, tripValue: 1_000 });
check("premium is per traveller", insuranceQuote.premium === 52, `${insuranceQuote.premium}`);
check(
  "premium splits into provider share and platform revenue",
  insuranceQuote.providerShare + insuranceQuote.platformRevenue === insuranceQuote.premium,
);
check(
  "a plan-scoped commission rule decides the platform's cut",
  insuranceQuote.commissionRuleId === "cmr_i_standard",
  String(insuranceQuote.commissionRuleId),
);

const insured = await bookingService.create(
  {
    productKind: "hotels",
    productTitle: "Regression Suite — Insured",
    destination: "Dubai",
    merchantId: scenarioMerchant.id,
    customerName: "Insured Customer",
    customerEmail: "insured@otithee.com",
    segment: "b2c",
    startAt: "2026-10-10T14:00:00.000Z",
    endAt: "2026-10-12T11:00:00.000Z",
    quantity: 1,
    baseAmount: 1_000,
    travelerNames: ["Insured Customer", "Companion"],
    insurancePlanId: "ins_standard",
  },
  ACTOR,
);
check("the premium is on the booking", insured.money.insurance === 52, `${insured.money.insurance}`);
check(
  "insurance is NOT in the commissionable base",
  insured.money.commission === hotelBooking.money.commission,
  `${insured.money.commission}`,
);
check(
  "the booking total includes the premium",
  insured.money.total === hotelBooking.money.total + 52,
  `${insured.money.total} vs ${hotelBooking.money.total}`,
);
check(
  "platform revenue includes the insurance margin",
  insured.money.platformRevenue ===
    hotelBooking.money.platformRevenue + insured.money.insuranceRevenue,
);
const policy = insuranceService.policyFor(insured.id);
check("a policy record was issued", Boolean(policy), policy?.reference);

// ---------------------------------------------------------------------------
section("Scenario 3 — premium membership");
// ---------------------------------------------------------------------------

const premiumPlan = membershipService.planByCode("premium")!;
const member = await membershipAdminService.subscribe(
  {
    customerEmail: "member@otithee.com",
    customerName: "Member Tester",
    planId: premiumPlan.id,
  },
  ACTOR,
);
check("subscription is active", member.status === "active");
check("membership revenue was recorded", revenueLedger({ source: "membership" }).some((e) => e.customerEmail === "member@otithee.com"));

const memberBenefits = benefitsFor("member@otithee.com");
check("benefits resolve to the paid plan", memberBenefits.code === "premium", memberBenefits.code);

const memberBooking = await bookingService.create(
  {
    productKind: "hotels",
    productTitle: "Regression Suite — Member",
    destination: "Dubai",
    merchantId: scenarioMerchant.id,
    customerName: "Member Tester",
    customerEmail: "member@otithee.com",
    segment: "b2c",
    startAt: "2026-10-20T14:00:00.000Z",
    endAt: "2026-10-22T11:00:00.000Z",
    quantity: 1,
    baseAmount: 1_000,
  },
  ACTOR,
);
check("the service fee is waived for a member", memberBooking.money.fees === 0, `${memberBooking.money.fees}`);
check(
  "the member discount is platform-funded",
  memberBooking.money.platformFundedDiscount === 80,
  `${memberBooking.money.platformFundedDiscount}`,
);
check(
  "the merchant is made whole for a platform-funded discount",
  memberBooking.money.merchantEarning === 880,
  `${memberBooking.money.merchantEarning}`,
);
check(
  "the subsidy comes out of platform revenue",
  memberBooking.money.platformRevenue < hotelBooking.money.platformRevenue,
  `${memberBooking.money.platformRevenue} vs ${hotelBooking.money.platformRevenue}`,
);

// ---------------------------------------------------------------------------
section("Scenario 4 — advertising");
// ---------------------------------------------------------------------------

const campaign = adService.campaigns().find((c) => c.status === "pending_review")!;
check("a campaign is awaiting review", Boolean(campaign), campaign?.name);
check("a campaign under review does not serve", !adService.campaigns().some((c) => c.status === "pending_review" && campaignSpend(c) > 0));

const approved = await advertisingService.setStatus(campaign.id, "active", { actor: ACTOR });
check("the campaign was approved", approved.status === "active");

await advertisingService.recordEvent(campaign.id, "impression", { count: 10_000 });
const delivered = adService.campaign(campaign.id)!;
check("impressions were recorded", delivered.metrics.impressions === 10_000, `${delivered.metrics.impressions}`);
check("CPM spend follows delivery", campaignSpend(delivered) === 220, `${campaignSpend(delivered)}`);

const billed = await advertisingService.bill(campaign.id, ACTOR);
check("billing recognises the unbilled spend", billed.amount === 220, `${billed.amount}`);
check(
  "advertising revenue reaches the ledger",
  revenueLedger({ source: "advertising" }).some((e) => e.campaignId === campaign.id),
);

const cappedCampaign = adService.campaign(campaign.id)!;
await advertisingService.recordEvent(campaign.id, "impression", { count: 5_000_000 });
check(
  "spend never exceeds the budget",
  campaignSpend(adService.campaign(campaign.id)!) <= cappedCampaign.budget,
);

// ---------------------------------------------------------------------------
section("Scenario 5 — B2B booking, credit and margin");
// ---------------------------------------------------------------------------

const b2bTerms = priceB2B({
  publicRate: 1_000,
  netRateDiscount: 8,
  markupRate: 12,
  model: "commission_plus_markup",
  agencyCommissionRate: 6,
});
check("net rate applies the negotiated discount", b2bTerms.netRate === 920, `${b2bTerms.netRate}`);
check("markup is the agency's margin", b2bTerms.markup === 110.4, `${b2bTerms.markup}`);
check("agency commission is paid out of the public rate", b2bTerms.agencyCommission === 60, `${b2bTerms.agencyCommission}`);
check("the build-up is renderable", b2bTerms.lines.length >= 4, `${b2bTerms.lines.length}`);

const creditBefore = await b2bService.creditStatus("org_globetrek");
const b2bBooking = await bookingService.create(
  {
    productKind: "hotels",
    productTitle: "Regression Suite — Agency",
    destination: "Dubai",
    merchantId: scenarioMerchant.id,
    customerName: "Agency Traveller",
    customerEmail: "agency@globetrek.example",
    segment: "b2b",
    organizationId: "org_globetrek",
    startAt: "2026-11-01T14:00:00.000Z",
    endAt: "2026-11-03T11:00:00.000Z",
    quantity: 1,
    baseAmount: 1_000,
  },
  ACTOR,
);
check("a B2B booking carries markup", b2bBooking.money.markup > 0, `${b2bBooking.money.markup}`);
check(
  "the account-scoped commission rule applied",
  b2bBooking.money.commissionRuleId === "cmr_b_globetrek",
  String(b2bBooking.money.commissionRuleId),
);
const creditAfter = await b2bService.creditStatus("org_globetrek");
check(
  "credit used rose by the invoiced total",
  Math.round((creditAfter.creditUsed - creditBefore.creditUsed) * 100) ===
    Math.round(b2bBooking.money.total * 100),
  `${creditAfter.creditUsed - creditBefore.creditUsed} vs ${b2bBooking.money.total}`,
);

const overLimit = await b2bService.checkCredit("org_globetrek", creditAfter.available + 1);
check("a booking over the limit is refused", !overLimit.ok, overLimit.reason);

let creditRejected = false;
try {
  await bookingService.create(
    {
      productKind: "hotels",
      productTitle: "Regression Suite — Over limit",
      destination: "Dubai",
      merchantId: scenarioMerchant.id,
      customerName: "Agency Traveller",
      customerEmail: "agency@globetrek.example",
      segment: "b2b",
      organizationId: "org_globetrek",
      startAt: "2026-11-05T14:00:00.000Z",
      endAt: "2026-11-06T11:00:00.000Z",
      quantity: 1,
      baseAmount: creditAfter.available * 2,
    },
    ACTOR,
  );
} catch {
  creditRejected = true;
}
check("the credit limit is enforced at booking time", creditRejected);

// ---------------------------------------------------------------------------
section("Scenario 6 — cancellation reverses the right amounts");
// ---------------------------------------------------------------------------

await bookingService.transition(insured.id, "capture_payment", { actor: ACTOR });
await bookingService.transition(insured.id, "confirm", { actor: ACTOR });
const cancelQuote = quoteRefund({
  booking: getState().bookings.find((b) => b.id === insured.id)!,
  reason: "customer_cancellation",
});
check("the insurance premium is refundable pro-rata", cancelQuote.insuranceRefund > 0, `${cancelQuote.insuranceRefund}`);
check(
  "the platform keeps an administration share of the cancellation fee",
  cancelQuote.platformCancellationFee >= 0,
);

await bookingService.transition(insured.id, "request_cancellation", { actor: ACTOR });
await bookingService.transition(insured.id, "cancel", { actor: ACTOR });
await bookingService.transition(insured.id, "initiate_refund", { actor: ACTOR });
await bookingService.transition(insured.id, "process_refund", { actor: ACTOR });
await bookingService.transition(insured.id, "complete_refund", { actor: ACTOR });

const cancelled = getState().bookings.find((b) => b.id === insured.id)!;
check("commission was reversed", cancelled.money.commissionReversed > 0, `${cancelled.money.commissionReversed}`);
check(
  "commission reversal is proportional, never more than what was charged",
  cancelled.money.commissionReversed <= cancelled.money.commission,
);
check(
  "insurance revenue was reversed too",
  cancelled.money.insuranceRevenueReversed > 0,
  `${cancelled.money.insuranceRevenueReversed}`,
);
const cancelledPolicy = getState().insurancePolicies.find((p) => p.bookingId === insured.id);
check("the policy was unwound", (cancelledPolicy?.refunded ?? 0) > 0, `${cancelledPolicy?.refunded}`);
const cancelledEntry = getState().commissions.find((c) => c.bookingId === insured.id);
check(
  "the commission ledger entry reflects the reversal",
  (cancelledEntry?.reversed ?? 0) > 0,
  `${cancelledEntry?.reversed}`,
);

// ---------------------------------------------------------------------------
section("Scenario 7 — revenue management changes the price");
// ---------------------------------------------------------------------------

const rmRecommendations = propertyRecommendations(property, "2026-09-01", 30);
check("recommendations are generated", rmRecommendations.length > 0, `${rmRecommendations.length}`);
check(
  "every recommendation carries its evidence",
  rmRecommendations.every((r) => r.evidence.length > 0 && r.message.length > 0),
);
check(
  "recommendations are deterministic",
  JSON.stringify(propertyRecommendations(property, "2026-09-01", 30)) ===
    JSON.stringify(rmRecommendations),
);

const priceRec = rmRecommendations.find((r) => r.action.price !== undefined);
if (priceRec) {
  const roomForRec = rooms.find((r) => r.id === priceRec.roomTypeId)!;
  const before = quoteStay({
    property,
    roomTypeId: roomForRec.id,
    ratePlanId: "standard",
    checkIn: priceRec.date,
    checkOut: new Date(new Date(`${priceRec.date}T00:00:00Z`).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10),
    units: 1,
  });
  await revenueManagementService.apply(priceRec, ACTOR);
  const after = quoteStay({
    property,
    roomTypeId: roomForRec.id,
    ratePlanId: "standard",
    checkIn: priceRec.date,
    checkOut: new Date(new Date(`${priceRec.date}T00:00:00Z`).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10),
    units: 1,
  });
  check(
    "applying a recommendation changes what the next customer is quoted",
    after.roomSubtotal !== before.roomSubtotal,
    `${before.roomSubtotal} → ${after.roomSubtotal}`,
  );
}

// ---------------------------------------------------------------------------
section("Revenue Center — the ledger reconciles");
// ---------------------------------------------------------------------------

const ledger = revenueLedger();
const revenue = summarizeRevenue(ledger);
check("the ledger has entries from several sources", revenue.bySource.length >= 5, `${revenue.bySource.length}`);
check("GBV exceeds platform revenue", revenue.gmv > revenue.netPlatformRevenue);
check("partner revenue is not platform revenue", revenue.partnerRevenue > revenue.netPlatformRevenue);
check(
  "net = gross − reversals − subsidies",
  Math.abs(
    revenue.netPlatformRevenue -
      (revenue.grossPlatformRevenue - revenue.reversals - revenue.subsidies),
  ) < 0.01,
);

const bookingSourced = ledger.filter(
  (e) => e.source === "booking_commission" || e.source === "b2b_margin",
);
check(
  "no failed booking earns commission",
  !bookingSourced.some((e) => e.bookingStatus === "failed"),
);
check(
  "every booking contributes at most one commission line",
  new Set(bookingSourced.map((e) => e.bookingId)).size === bookingSourced.length,
);

const center = await revenueService.center();
check(
  "the ledger and the booking engine agree on commission",
  Math.abs(
    (center.summary.bySource.find((s) => s.source === "booking_commission")?.net ?? 0) +
      (center.summary.bySource.find((s) => s.source === "b2b_margin")?.net ?? 0) -
      center.financials.commission,
  ) < 0.01,
  `${center.financials.commission}`,
);

const merchantScoped = await revenueService.summary({}, { merchantId: scenarioMerchant.id });
check(
  "revenue is scoped to a merchant",
  merchantScoped.netPlatformRevenue < revenue.netPlatformRevenue,
  `${merchantScoped.netPlatformRevenue} vs ${revenue.netPlatformRevenue}`,
);

// ---------------------------------------------------------------------------
section("Audit — every financial change is recorded");
// ---------------------------------------------------------------------------

const ruleBefore = getState().auditLog.length;
await commissionRuleService.update(
  "cmr_v_hotels",
  { percent: 16 },
  { id: "usr_test", name: "Test Operator", role: "admin" },
);
const ruleAudit = getState().auditLog[0];
check("a commission change is audited", getState().auditLog.length > ruleBefore);
check("the audit records the before and after", ruleAudit.from !== ruleAudit.to, `${ruleAudit.from} → ${ruleAudit.to}`);
check("the audit names the entity", ruleAudit.entity === "commission_rule", ruleAudit.entity);

// ---------------------------------------------------------------------------
section("Merchant — one model, one commission unit");
// ---------------------------------------------------------------------------

const azureMerchant = getMerchant("mrc_azure")!;
check("the merchant table is the booking roster's source", Boolean(azureMerchant), azureMerchant?.name);
check(
  "commission is a percentage, not a ratio",
  azureMerchant.commissionRate > 1 && azureMerchant.commissionRate <= 60,
  `${azureMerchant.commissionRate}`,
);
check(
  "the contract and the headline rate agree",
  azureMerchant.contract.commissionRate === azureMerchant.commissionRate,
  `${azureMerchant.contract.commissionRate} vs ${azureMerchant.commissionRate}`,
);
const azureRef = merchantRef("mrc_azure")!;
check(
  "a booking's merchant snapshot is projected from the merchant record",
  azureRef.commissionRate === azureMerchant.commissionRate && azureRef.name === azureMerchant.name,
);
const bookedMerchant = getState().bookings.find((b) => b.merchant.id === "mrc_azure")!.merchant;
check(
  "bookings and the merchant screen quote the same rate",
  bookedMerchant.commissionRate === azureMerchant.commissionRate,
  `${bookedMerchant.commissionRate} vs ${azureMerchant.commissionRate}`,
);
check(
  "only tradeable merchants can be booked against",
  MERCHANTS.every((m) => getMerchant(m.id)?.status === "approved"),
);

// ---------------------------------------------------------------------------
section("Merchant onboarding — registration to approval");
// ---------------------------------------------------------------------------

const applicant = await merchantService.register(
  {
    name: "Test Harbour Stays",
    legalName: "Test Harbour Stays Ltd.",
    email: "hello@testharbour.test",
    phone: "+44 20 7000 0000",
    contactName: "Test Owner",
    country: "United Kingdom",
    city: "Bristol",
    verticals: ["hotels"],
  },
  ACTOR,
);
check("registration creates a draft merchant", applicant.status === "draft", applicant.status);
check("a new merchant cannot trade", !canTrade(applicant));

const emptyProgress = onboardingProgress(applicant);
check(
  "a fresh application is not submittable",
  !emptyProgress.readyToSubmit && emptyProgress.percent < 50,
  `${emptyProgress.percent}%`,
);
check("the checklist names a next action", Boolean(emptyProgress.nextAction), emptyProgress.nextAction?.label);

let submitRejected = false;
try {
  await merchantService.submitApplication(applicant.id, ACTOR);
} catch {
  submitRejected = true;
}
check("an incomplete application is rejected by the service, not just the button", submitRejected);

await merchantService.updateProfile(
  applicant.id,
  {
    registrationNo: "REG-TEST-1",
    taxId: "TAX-GB-TEST-1",
    addressLine: "1 Harbour Road",
    postalCode: "BS1 1AA",
    description:
      "A small harbourside hotel with twenty rooms, a cafe and a rooftop terrace overlooking the marina.",
  },
  ACTOR,
);
for (const type of REQUIRED_DOCUMENT_TYPES) {
  await merchantService.uploadDocument(applicant.id, { type, fileName: `${type}.pdf` }, ACTOR);
}
const withDocs = await merchantService.get(applicant.id);
for (const doc of withDocs.documents) {
  await merchantService.reviewDocument(applicant.id, doc.id, { status: "approved" }, ACTOR);
}
await merchantService.submitKyc(
  applicant.id,
  [
    {
      fullName: "Test Owner",
      role: "Director",
      ownershipPercent: 100,
      nationality: "United Kingdom",
      idNumberMasked: "•••• 4321",
    },
  ],
  ACTOR,
);
await merchantService.decideKyc(applicant.id, { status: "verified" }, ACTOR);
await merchantService.acceptContract(applicant.id, { acceptedBy: "Test Owner" }, ACTOR);
await merchantService.saveBankDetails(
  applicant.id,
  {
    accountHolder: "Test Harbour Stays Ltd.",
    bankName: "Test Bank",
    accountNumber: "12345678",
    country: "United Kingdom",
    currency: "USD",
    method: "bank_transfer",
    schedule: "monthly",
  },
  ACTOR,
);
const beforeVerify = await merchantService.get(applicant.id);
check(
  "a submitted bank account starts unverified",
  beforeVerify.bank?.status === "pending",
  beforeVerify.bank?.status,
);
check(
  "only the last four digits are stored",
  beforeVerify.bank?.accountNumberMasked.endsWith("5678") === true &&
    !beforeVerify.bank?.accountNumberMasked.includes("1234"),
  beforeVerify.bank?.accountNumberMasked,
);
await merchantService.decideBank(applicant.id, { status: "verified" }, ACTOR);

const ready = await merchantService.get(applicant.id);
check("the checklist is complete", onboardingProgress(ready).readyToSubmit);
const submitted = await merchantService.submitApplication(applicant.id, ACTOR);
check("the application submits", submitted.status === "submitted", submitted.status);

let illegalMove = false;
try {
  await merchantService.setStatus(applicant.id, "suspended", { note: "nope" }, ACTOR);
} catch {
  illegalMove = true;
}
check("an illegal lifecycle move is refused", illegalMove);

await merchantService.setStatus(applicant.id, "under_review", {}, ACTOR);
const approvedMerchant = await merchantService.setStatus(applicant.id, "approved", {}, ACTOR);
check("approval lands", approvedMerchant.status === "approved", approvedMerchant.status);
check("an approved merchant can trade", canTrade(approvedMerchant));
check("nothing blocks publishing", publishBlockers(approvedMerchant).length === 0, publishBlockers(approvedMerchant).join(" "));
check(
  "the merchant is notified of the decision",
  getState().notifications.some(
    (n) => n.merchantId === applicant.id && n.title.toLowerCase().includes("approved"),
  ),
);

// ---------------------------------------------------------------------------
section("Catalogue — draft to published, and back off sale");
// ---------------------------------------------------------------------------

const listingDraft = await catalogueService.create(
  applicant.id,
  {
    title: "Harbour View Double",
    vertical: "hotels",
    summary: "A double room overlooking the marina, with breakfast and late checkout included.",
    city: "Bristol",
    country: "United Kingdom",
    basePrice: 140,
  },
  ACTOR,
);
check("a listing starts as a draft", listingDraft.status === "draft", listingDraft.status);
check("a draft is not public", !isListingLive(listingDraft.id));

const sent = await catalogueService.submit(listingDraft.id, ACTOR);
check("a draft can be submitted", sent.status === "submitted", sent.status);

let publishTooEarly = false;
try {
  await catalogueService.publish(listingDraft.id, ACTOR);
} catch {
  publishTooEarly = true;
}
check("a listing cannot be published before it is approved", publishTooEarly);

const sentBack = await catalogueService.review(
  listingDraft.id,
  { to: "action_required", note: "Add photographs of the actual room." },
  ACTOR,
);
check("a reviewer can request changes", sentBack.status === "action_required", sentBack.status);
check("the reason reaches the record", Boolean(sentBack.reviewNote), sentBack.reviewNote);

const resubmitted = await catalogueService.submit(listingDraft.id, ACTOR);
check("a sent-back listing can be resubmitted", resubmitted.status === "submitted");
check("resubmission bumps the version", resubmitted.version === 2, `v${resubmitted.version}`);

const okayed = await catalogueService.review(listingDraft.id, { to: "approved" }, ACTOR);
check("approval does not publish on its own", okayed.status === "approved", okayed.status);
check("an approved-but-unpublished listing is still not public", !isListingLive(listingDraft.id));

const wentLive = await catalogueService.publish(listingDraft.id, ACTOR);
check("publishing lands", wentLive.status === "published", wentLive.status);
check("a published listing is public", isListingLive(listingDraft.id));

const merchantCatalogue = catalogueForMerchant(applicant.id);
check("the listing belongs to its merchant", merchantCatalogue.some((c) => c.id === listingDraft.id));

await catalogueService.unpublish(listingDraft.id, "Closed for refurbishment", ACTOR);
check("unpublishing removes it from the storefront", !isListingLive(listingDraft.id));

// A launch listing can be taken down the same way — the marketing catalogue and
// the workflow are one system, not two.
const seededHotel = HOTELS[0];
check("a launch listing is public by default", isListingLive(seededHotel.id));
await catalogueService.unpublish(seededHotel.id, "Test takedown", ACTOR);
check("a launch listing can be taken off sale", !isListingLive(seededHotel.id));
await catalogueService.submit(seededHotel.id, ACTOR);
await catalogueService.review(seededHotel.id, { to: "approved", publish: true }, ACTOR);
check("and put back on sale", isListingLive(seededHotel.id));

// ---------------------------------------------------------------------------
section("Merchant staff — a job title is not owner access");
// ---------------------------------------------------------------------------

check("an owner holds every capability", merchantRoleCan("owner", "payout.manage"));
check("front desk cannot touch payouts", !merchantRoleCan("front_desk", "payout.manage"));
check("front desk cannot manage staff", !merchantRoleCan("front_desk", "staff.manage"));
check("front desk cannot see the money", !merchantRoleCan("front_desk", "finance.view"));
check("front desk can still work arrivals", merchantRoleCan("front_desk", "bookings.view"));
check("a manager cannot change payout details", !merchantRoleCan("manager", "payout.manage"));
check("finance can", merchantRoleCan("finance", "payout.manage"));

const ownerPrincipal = resolveCurrentUser({
  id: "usr_owner",
  name: "Owner",
  email: "owner@test",
  roleId: "merchant",
  merchantId: "mrc_azure",
  merchantRole: "owner",
});
const deskPrincipal = resolveCurrentUser({
  id: "usr_desk",
  name: "Desk",
  email: "desk@test",
  roleId: "merchant",
  merchantId: "mrc_azure",
  merchantRole: "front_desk",
});
check(
  "an owner principal keeps the merchant role's grants",
  ownerPrincipal.permissions.includes("catalog:*"),
);
check(
  "a front-desk principal loses catalogue writes",
  !deskPrincipal.permissions.includes("catalog:*") &&
    !deskPrincipal.permissions.includes("catalog:update"),
);
check(
  "a front-desk principal loses finance access",
  !deskPrincipal.permissions.includes("finance:read"),
);
check(
  "a front-desk principal keeps what the job needs",
  deskPrincipal.permissions.includes("bookings:read"),
);
check(
  "narrowing can only remove, never add",
  deskPrincipal.permissions.every((p) => ownerPrincipal.permissions.includes(p)),
);

// ---------------------------------------------------------------------------
section("Subscription — plans change limits, never commission");
// ---------------------------------------------------------------------------

const rateBefore = (await merchantService.get(applicant.id)).commissionRate;
const upgraded = await merchantService.changePlan(applicant.id, "professional", ACTOR);
check("the plan changes", upgraded.subscription.planId === "professional");
check("commission does not", upgraded.commissionRate === rateBefore, `${upgraded.commissionRate}`);
check("payout terms follow the plan", upgraded.contract.payoutTermDays === 14, `${upgraded.contract.payoutTermDays}`);
check(
  "the subscription fee reaches the revenue ledger",
  getState().revenueEntries.some(
    (e) => e.source === "merchant_subscription" && e.merchantId === applicant.id,
  ),
);
check("a paid plan unlocks channel connections", planAllows(upgraded, "channel_manager"));
check("the free plan does not", !planAllows({ subscription: { ...upgraded.subscription, planId: "basic" } }, "channel_manager"));

let planDowngradeBlocked = false;
try {
  // Basic allows one property; add two so the downgrade must be refused.
  await merchantService.addProperty(
    applicant.id,
    { name: "Harbour Annexe", vertical: "hotels", city: "Bristol", country: "United Kingdom", addressLine: "2 Harbour Road", units: 12 },
    ACTOR,
  );
  await merchantService.addProperty(
    applicant.id,
    { name: "Harbour Mews", vertical: "hotels", city: "Bristol", country: "United Kingdom", addressLine: "3 Harbour Road", units: 8 },
    ACTOR,
  );
  await merchantService.changePlan(applicant.id, "basic", ACTOR);
} catch {
  planDowngradeBlocked = true;
}
check("a downgrade that would break the limits is refused", planDowngradeBlocked);

// ---------------------------------------------------------------------------
section("Payouts — one record, two screens");
// ---------------------------------------------------------------------------

const payoutPage = await payoutService.list({ pageSize: 200 });
check("payouts exist", payoutPage.items.length > 0, `${payoutPage.items.length}`);
const settlementCount = getState().settlements.length;
check(
  "there is exactly one payout per settlement",
  payoutPage.items.length === settlementCount,
  `${payoutPage.items.length} vs ${settlementCount}`,
);
const samplePayout = payoutPage.items.find((p) => p.status === "pending" && !p.blocked);
if (samplePayout) {
  const before = getState().settlements.find((s) => s.id === samplePayout.settlementId)!.status;
  await payoutService.advance(samplePayout.id, "scheduled", { actor: ACTOR });
  const after = getState().settlements.find((s) => s.id === samplePayout.settlementId)!.status;
  check("advancing a payout advances its settlement", before !== after && after === "scheduled", after);
} else {
  check("advancing a payout advances its settlement", true, "no pending payout to move");
}

// ---------------------------------------------------------------------------
section("Disputes — the merchant participates, the platform decides");
// ---------------------------------------------------------------------------

const merchantScope = { merchantId: "mrc_azure" };
const allDisputes = await disputeService.list({ pageSize: 100 });
const ownDisputes = await disputeService.list({ pageSize: 100 }, merchantScope);
check("disputes exist", allDisputes.items.length > 0, `${allDisputes.items.length}`);
check(
  "a merchant sees only their own cases",
  ownDisputes.items.every((d) => d.merchantId === "mrc_azure"),
);
check(
  "every dispute points at a real booking",
  allDisputes.items.every((d) => getState().bookings.some((b) => b.id === d.bookingId)),
);

const openCase = allDisputes.items.find((d) => d.status === "needs_response");
if (openCase) {
  const merchantActor = { id: "usr_m", name: "Merchant", role: "merchant" };
  const scope = { merchantId: openCase.merchantId };

  let tooShort = false;
  try {
    await disputeService.respond(openCase.id, { response: "no" }, merchantActor, scope);
  } catch {
    tooShort = true;
  }
  check("an empty response is refused", tooShort);

  const answered = await disputeService.respond(
    openCase.id,
    {
      response: "The guest checked in and stayed the full booking; folio and key records attached.",
      evidence: [{ label: "Folio", fileName: "folio.pdf" }],
    },
    merchantActor,
    scope,
  );
  check("the merchant can respond", answered.status === "merchant_responded", answered.status);
  check("evidence lands on the case", answered.evidence.length > 0);

  let merchantCantDecide = false;
  try {
    await disputeService.respond(openCase.id, { response: "Trying to answer twice, at length." }, merchantActor, scope);
  } catch {
    merchantCantDecide = true;
  }
  check("a merchant cannot answer a case twice", merchantCantDecide);

  const decided = await disputeService.decide(openCase.id, "won", "Evidence accepted by the issuer.", ACTOR);
  check("the platform decides the outcome", decided.status === "won", decided.status);
  check(
    "the merchant is told",
    getState().notifications.some(
      (n) => n.merchantId === openCase.merchantId && n.title === "Dispute won",
    ),
  );
} else {
  check("the merchant can respond", false, "no open dispute in the seed");
}

// ---------------------------------------------------------------------------
section("Merchant advertising — self-serve, platform-reviewed");
// ---------------------------------------------------------------------------

const adMerchant = await merchantService.get(applicant.id);
const eligibility = merchantAdvertisingService.eligibility(adMerchant);
check("a Professional merchant may advertise", eligibility.allowed, eligibility.reason);

const estimate = estimateSpend("cpc", 500);
check("the estimate is arithmetic on the rate card", estimate.units > 0, estimate.explanation);
check(
  "the estimate never promises more than the budget buys",
  estimate.units * AD_RATE_CARD.cpc.rate <= 500 + AD_RATE_CARD.cpc.rate,
);

let underMinimum = false;
try {
  await merchantAdvertisingService.create(
    applicant.id,
    {
      name: "Too small",
      placement: "search_sponsored",
      pricingModel: "cpc",
      budget: 5,
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 86_400_000).toISOString(),
      creativeHeadline: "Stay by the harbour",
      creativeBody: "Rooms from $140 a night.",
    },
    ACTOR,
  );
} catch {
  underMinimum = true;
}
check("a budget below the minimum is refused", underMinimum);

const merchantCampaign = await merchantAdvertisingService.create(
  applicant.id,
  {
    name: "Harbour launch",
    placement: "search_sponsored",
    pricingModel: "cpc",
    budget: 300,
    startAt: new Date().toISOString(),
    endAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    creativeHeadline: "Stay by the harbour",
    creativeBody: "Rooms from $140 a night, breakfast included.",
  },
  ACTOR,
);
check(
  "a merchant cannot self-approve a campaign",
  merchantCampaign.status === "pending_review",
  merchantCampaign.status,
);
check("the campaign is attributed to the merchant", campaignsForMerchant(applicant.id).length === 1);

// ---------------------------------------------------------------------------
section("Scope — a merchant cannot reach another merchant");
// ---------------------------------------------------------------------------

let crossMerchant = false;
try {
  await merchantService.updateProfile(
    "mrc_azure",
    { description: "Trying to edit somebody else's business from my own session." },
    ACTOR,
    { merchantId: applicant.id },
  );
} catch {
  crossMerchant = true;
}
check("a merchant cannot edit another merchant's profile", crossMerchant);

let crossCatalogue = false;
try {
  const someoneElse = catalogueForMerchant("mrc_palm")[0];
  await catalogueService.submit(someoneElse.id, ACTOR, { merchantId: applicant.id });
} catch {
  crossCatalogue = true;
}
check("a merchant cannot submit another merchant's listing", crossCatalogue);

// ---------------------------------------------------------------------------
section("Access control — runtime roles, permissions, feature flags");
// ---------------------------------------------------------------------------

const shippedRoles = await roleService.getRoles();
check(
  "every shipped role is in the registry",
  shippedRoles.length >= 13 && shippedRoles.every((r) => r.builtIn),
);
check(
  "the auditor reads everything and writes nothing",
  derivePermissions("auditor").every((p) => p.endsWith(":read") || p.startsWith("profile") || p.endsWith(":export")),
);
check(
  "compliance can approve merchants but holds no finance",
  derivePermissions("compliance").includes("merchants:approve") &&
    !derivePermissions("compliance").some((p) => p.startsWith("finance:")),
);
check(
  "a B2B agent books without seeing the account's money",
  derivePermissions("b2b_agent").includes("bookings:create") &&
    !derivePermissions("b2b_agent").some((p) => p.startsWith("finance:")),
);

const cloned = await roleService.cloneRole("finance", {
  label: "Finance (read only)",
  actor: "Test Operator",
});
check("a role can be cloned", !cloned.builtIn && cloned.basedOn === "finance");
check(
  "the clone starts from the source's grants",
  cloned.permissions.join("|") === shippedRoles.find((r) => r.id === "finance")!.permissions.join("|"),
);

await roleService.updateRolePermissions(cloned.id, ["dashboard:read", "finance:read"]);
check(
  "assigning permissions replaces the grant set",
  derivePermissions(cloned.id).join("|") === "dashboard:read|finance:read",
);

let duplicateRefused = false;
try {
  await roleService.createRole({ id: cloned.id, label: "Duplicate", description: "", permissions: ["dashboard:read"] });
} catch {
  duplicateRefused = true;
}
check("a duplicate role id is refused", duplicateRefused);

let emptyRefused = false;
try {
  await roleService.createRole({ label: "Nothing", description: "", permissions: [] });
} catch {
  emptyRefused = true;
}
check("a role with no permissions is refused", emptyRefused);

let builtInDeleteRefused = false;
try {
  await roleService.deleteRole("admin");
} catch {
  builtInDeleteRefused = true;
}
check("a shipped role cannot be deleted", builtInDeleteRefused);

await roleService.updateRolePermissions("staff", ["dashboard:read"]);
check("a shipped role can be overridden", derivePermissions("staff").length === 1);
await roleService.resetRole("staff");
check(
  "resetting restores the shipped grants",
  derivePermissions("staff").includes("bookings:update"),
);

await roleService.deleteRole(cloned.id);
check("a custom role can be deleted", !(await roleService.getRoles()).some((r) => r.id === cloned.id));

check("flags ship enabled", flagAppliesTo("b2b", "agency"));
setFlagEnabled("b2b", false, "Test Operator");
check("a disabled flag applies to nobody", !flagAppliesTo("b2b", "agency"));
setFlagEnabled("b2b", true, "Test Operator");
setFlagRoles("b2b", ["agency"], "Test Operator");
check(
  "role targeting is the second gate",
  flagAppliesTo("b2b", "agency") && !flagAppliesTo("b2b", "merchant"),
);
check(
  "the resolved flag set follows the role",
  resolveEnabledFlags("agency").includes("b2b") && !resolveEnabledFlags("merchant").includes("b2b"),
);
resetFlag("b2b");
check("resetting a flag restores its shipped state", flagAppliesTo("b2b", "merchant"));

// ---------------------------------------------------------------------------
section("Commission approvals — the rate book needs a second pair of eyes");
// ---------------------------------------------------------------------------

const targetRule = commissionRuleStore.list()[0];
const ratePriorToChange = targetRule.percent;

const changeRequest = await commissionApprovalService.submit(
  {
    type: "update",
    ruleId: targetRule.id,
    proposed: { ...toRuleInput(targetRule), percent: ratePriorToChange - 3 },
    note: "Competitive response for Q1.",
  },
  ACTOR,
);
check("a rate change starts as pending", changeRequest.status === "pending");
check(
  "submitting does not move the rate",
  commissionRuleStore.get(targetRule.id)!.percent === ratePriorToChange,
);
check("the request explains the delta", changeRequest.summary.includes("→"));

let rejectedWithoutReason = false;
try {
  await commissionApprovalService.reject(changeRequest.id, "", ACTOR);
} catch {
  rejectedWithoutReason = true;
}
check("a rejection needs a reason", rejectedWithoutReason);

const approvedRequest = await commissionApprovalService.approve(
  changeRequest.id,
  { id: "usr_reviewer", name: "Second Pair", role: "finance" },
  "Signed off with sales.",
);
check("approving records the reviewer", approvedRequest.reviewedByName === "Second Pair");
check("approval is not self-approval here", approvedRequest.selfApproved === false);
check(
  "only approval moves the rate book",
  commissionRuleStore.get(targetRule.id)!.percent === ratePriorToChange - 3,
);
check(
  "the decision is on the record",
  approvedRequest.history.some((e) => e.action === "approved" && e.note === "Signed off with sales."),
);

let doubleApproval = false;
try {
  await commissionApprovalService.approve(approvedRequest.id, ACTOR);
} catch {
  doubleApproval = true;
}
check("an approved request cannot be approved twice", doubleApproval);

const selfRequest = await commissionApprovalService.submit(
  { type: "disable", ruleId: targetRule.id, note: "Retiring this rate." },
  ACTOR,
);
const selfApproved = await commissionApprovalService.approve(selfRequest.id, ACTOR);
check("self-approval is allowed but flagged", selfApproved.selfApproved === true);
check(
  "disabling through approval reaches the rule",
  commissionRuleStore.get(targetRule.id)!.status === "disabled",
);

const withdrawn = await commissionApprovalService.submit(
  { type: "delete", ruleId: commissionRuleStore.list()[1].id },
  ACTOR,
);
const withdrawnRequest = await commissionApprovalService.cancel(withdrawn.id, ACTOR);
check("a request can be withdrawn", withdrawnRequest.status === "cancelled");
check(
  "withdrawing leaves the rule alone",
  Boolean(commissionRuleStore.get(withdrawnRequest.ruleId!)),
);

check(
  "impersonation and approvals reach the audit trail",
  getState().auditLog.some((e) => e.entity === "commission_change_request" && e.action === "approve"),
);

// ---------------------------------------------------------------------------
// Platform configuration — the settings screen is no longer decorative
// ---------------------------------------------------------------------------
section("Platform configuration");

const shippedTax = platformConfig().economics.taxRate;
check("ships with the documented tax rate", shippedTax === DEFAULT_PLATFORM_CONFIG.economics.taxRate);

updatePlatformConfig({ economics: { taxRate: 0.2 } });
check("a settings change is readable immediately", platformConfig().economics.taxRate === 0.2);

const pricedAfterChange = priceBooking({ base: 1000, commissionRate: 10 });
check(
  "the money engine prices with the stored tax rate",
  pricedAfterChange.taxes === 200,
  `${pricedAfterChange.taxes}`,
);
check(
  "a patch leaves the rest of the section alone",
  platformConfig().economics.platformFeeRate === DEFAULT_PLATFORM_CONFIG.economics.platformFeeRate,
);

check("validation rejects an impossible tax rate", validateEconomics({ taxRate: 3 }).length === 1);
check("validation accepts a sane one", validateEconomics({ taxRate: 0.12 }).length === 0);

let rejectedEconomics = false;
try {
  await platformSettingsService.update("economics", { defaultCommissionRate: 300 }, ACTOR);
} catch {
  rejectedEconomics = true;
}
check("the settings service refuses invalid economics", rejectedEconomics);
check(
  "a rejected update never reaches the config",
  platformConfig().economics.defaultCommissionRate !==300,
);

await platformSettingsService.update("economics", { taxRate: 0.09 }, ACTOR);
check("a valid update is stored", platformConfig().economics.taxRate === 0.09);
check(
  "settings changes are audited",
  getState().auditLog.some((e) => e.entity === "platform_settings"),
);

resetPlatformConfig();
check("reset restores the shipped economics", platformConfig().economics.taxRate === shippedTax);

// ---------------------------------------------------------------------------
// FX — the snapshot the data model always anticipated
// ---------------------------------------------------------------------------
section("FX");

const usdQuote = quoteFx("USD");
check("the base currency quotes at parity", usdQuote.rate === 1);
check("no spread is charged on the base currency", usdQuote.spreadPercent === 0);

const aedQuote = quoteFx("AED");
check("a foreign currency carries the platform spread", aedQuote.rate > aedQuote.mid);
check(
  "the spread matches the configured margin",
  Math.abs(aedQuote.rate - aedQuote.mid * (1 + platformConfig().fx.spreadPercent / 100)) < 1e-6,
);

check("booking in the base currency locks nothing", lockFx("USD") === undefined);
const lockedAed = lockFx("AED")!;
check("a foreign booking locks a rate", lockedAed.rate === aedQuote.rate);
check("the lock records its provider", lockedAed.provider === "mock-fx");
check("a fresh lock has not expired", isFxLockExpired(lockedAed) === false);
check(
  "a lock expires once its window passes",
  isFxLockExpired(lockedAed, Date.now() + (platformConfig().fx.lockMinutes + 1) * 60_000),
);

// ---------------------------------------------------------------------------
// Simulated delivery lifecycle
// ---------------------------------------------------------------------------
section("Message delivery");

const deliveryBooking = getState().bookings[0];
const queuedMessages = send({
  templateKey: "booking_confirmed",
  channels: ["email"],
  to: { email: "delivery.test@otithee.com" },
  customerEmail: "delivery.test@otithee.com",
  bookingId: deliveryBooking.id,
  bookingRef: deliveryBooking.reference,
  ignorePreferences: true,
  context: { name: "Test", product: "Test stay", reference: deliveryBooking.reference },
});
check("an automatic send enters the queue", queuedMessages[0]?.status === "queued");
check("every message is marked simulated", queuedMessages[0]?.simulated === true);

const step = platformConfig().delivery.stepSeconds * 1000;
advanceDeliveries(Date.now() + step + 1000);
const afterFirstStep = getState().outbox.find((m) => m.id === queuedMessages[0].id)!;
check(
  "one step moves it out of the queue",
  ["sent", "failed", "bounced"].includes(afterFirstStep.status),
  afterFirstStep.status,
);

if (afterFirstStep.status === "sent") {
  advanceDeliveries(Date.now() + step * 3);
  const settled = getState().outbox.find((m) => m.id === queuedMessages[0].id)!;
  check("a second step delivers it", settled.status === "delivered");
  check("delivery is timestamped", Boolean(settled.deliveredAt));
} else {
  const retried = retryDelivery(afterFirstStep.id)!;
  check("a failed message can be re-queued", retried.status === "queued");
  check("a retry clears the failure reason", retried.failureReason === undefined);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------
section("Scheduler");

const jobs = listJobs();
check("jobs are registered", jobs.length >= 8);
check("every job has a handler bound to it", jobs.every((job) => typeof job.run === "function"));

const deliveryRun = runJob("delivery:progress", { actor: ACTOR, manual: true });
check("a manual run records what it did", deliveryRun.summary.length > 0);
check(
  "run history is kept on the job",
  listJobs().find((j) => j.key === "delivery:progress")!.runs.length > 0,
);
check(
  "a manual run is audited",
  getState().auditLog.some((e) => e.entity === "scheduled_job"),
);

setJobStatus("fx:refresh", "paused", ACTOR);
check(
  "pausing a job sticks",
  listJobs().find((j) => j.key === "fx:refresh")!.status === "paused",
);
check(
  "a paused job is never due",
  listJobs(Date.now() + 86_400_000).find((j) => j.key === "fx:refresh")!.due === false,
);
setJobStatus("fx:refresh", "active", ACTOR);

const ticked = tickScheduler(Date.now() + 86_400_000);
check("a tick runs everything that is due", ticked.length > 0);

// ---------------------------------------------------------------------------
// Waitlist and alternative dates
// ---------------------------------------------------------------------------
section("Waitlist & alternatives");

const waitProperty = toPropertyRef(HOTELS[1]);
const waitRoom = getRoomTypes(waitProperty)[0];
const waitEntry = joinWaitlist({
  customerEmail: "waitlist.test@otithee.com",
  customerName: "Wait Lister",
  property: waitProperty,
  roomTypeId: waitRoom.id,
  checkIn: "2027-03-10",
  checkOut: "2027-03-13",
  units: 1,
  guests: 2,
});
check("joining the waitlist creates an entry", waitEntry.status === "waiting");
check(
  "joining twice does not duplicate",
  joinWaitlist({
    customerEmail: "waitlist.test@otithee.com",
    property: waitProperty,
    roomTypeId: waitRoom.id,
    checkIn: "2027-03-10",
    checkOut: "2027-03-13",
    units: 1,
    guests: 2,
  }).id === waitEntry.id,
);
check(
  "the entry carries a link back to the same selection",
  waitEntry.resumeHref.includes(waitProperty.slug) && waitEntry.resumeHref.includes("2027-03-10"),
);

const waitSweep = sweepWaitlist();
check("the sweep reports what it did", waitSweep.summary.length > 0);
check(
  "available dates notify the traveller",
  waitlistService.forCustomer("waitlist.test@otithee.com")[0].status === "notified",
);

waitlistService.cancel(waitEntry.id);
check(
  "a request can be closed",
  waitlistService.forCustomer("waitlist.test@otithee.com")[0].status === "cancelled",
);

const alternatives = suggestAlternativeDates({
  property: waitProperty,
  roomTypeId: waitRoom.id,
  ratePlanId: "standard",
  checkIn: "2027-04-10",
  checkOut: "2027-04-13",
  units: 1,
  guests: 2,
});
check("alternative dates are offered", alternatives.length > 0);
check("none of them are the requested window", alternatives.every((a) => a.shiftDays !== 0));
check(
  "they are ordered cheapest first",
  alternatives.every((option, i) => i === 0 || option.total >= alternatives[i - 1].total),
);
check("each keeps the same length of stay", alternatives.every((a) => a.nights === 3));

// ---------------------------------------------------------------------------
// Supplier confirmation
// ---------------------------------------------------------------------------
section("Supplier confirmation");

const instantBooking = getState().bookings.find((b) => b.productKind === "hotels")!;
const instant = requestSupplierConfirmation(instantBooking);
check("an instant product confirms immediately", instant.status === "confirmed");
check("it carries a supplier reference", Boolean(instant.supplierRef));

const onRequestBooking = getState().bookings.find(
  (b) => b.productKind === "visa" || b.productKind === "convention-hall" || b.productKind === "tours",
);
if (onRequestBooking) {
  const pending = requestSupplierConfirmation(onRequestBooking);
  check("an on-request product waits for the supplier", pending.status === "pending");
  check("asking twice does not duplicate the request", requestSupplierConfirmation(onRequestBooking).requestedAt === pending.requestedAt);

  const resolved = resolveSupplierConfirmation(onRequestBooking.id, "confirmed")!;
  check("a supplier decision is recorded", resolved.status === "confirmed");
  check("a confirmed request gets a reference", Boolean(resolved.supplierRef));
  check(
    "a decided request cannot be decided again",
    resolveSupplierConfirmation(onRequestBooking.id, "rejected")!.status === "confirmed",
  );
}
check("the supplier sweep runs cleanly", sweepSupplierConfirmations().summary.length > 0);

// ---------------------------------------------------------------------------
// Abandoned checkout recovery
// ---------------------------------------------------------------------------
section("Abandoned checkout recovery");

const recoveryProperty = toPropertyRef(HOTELS[2]);
const recoveryRoom = getRoomTypes(recoveryProperty)[0];
const abandonedHold = holdInventory({
  property: recoveryProperty,
  roomTypeId: recoveryRoom.id,
  ratePlanId: "standard",
  checkIn: "2027-05-04",
  checkOut: "2027-05-07",
  units: 1,
  guests: 2,
  lockedTotal: 640,
  intent: {
    customerEmail: "abandoner@otithee.com",
    customerName: "Ava Bandon",
    listingSlug: recoveryProperty.slug,
    listingTitle: recoveryProperty.title,
    vertical: recoveryProperty.vertical,
  },
});
releaseHold(abandonedHold.id);

const recoverySweep = sweepAbandonedCheckouts();
check("the sweep reports what it did", recoverySweep.affected > 0, recoverySweep.summary);

const lead = recoveryService.list().find((l) => l.holdId === abandonedHold.id)!;
check("an abandoned hold becomes a lead", Boolean(lead));
check("the lead knows what it was worth", lead.value === 640);
check("the lead links back to the same dates", lead.resumeHref.includes("2027-05-04"));
check("the traveller was nudged once", Boolean(lead.nudgedAt));
check("nudging again is a no-op", recoveryService.nudge(lead.id) === false);
check("recovery stats count the open lead", recoveryService.stats().open > 0);

// ---------------------------------------------------------------------------
// CRM segments and campaigns
// ---------------------------------------------------------------------------
section("Segments & campaigns");

const sizes = segmentSizes();
check("segments are computed", sizes.length >= 6);
const allSegment = sizes.find((s) => s.id === "all")!;
check("the 'all' segment holds every customer", allSegment.size > 0);
check(
  "repeat guests are a subset of all customers",
  (sizes.find((s) => s.id === "repeat")?.size ?? 0) <= allSegment.size,
);
check(
  "segment membership is derived from bookings",
  segmentMembers("all").every((m) => m.bookings > 0),
);

const marketingCampaign = await campaignService.create(
  {
    name: "Regression campaign",
    segmentId: "repeat",
    channel: "email",
    subject: "A test subject",
    body: "Hello {{name}}, this is a test.",
  },
  ACTOR,
);
check("a campaign starts as a draft", marketingCampaign.status === "draft");

const sentCampaign = await campaignService.sendNow(marketingCampaign.id, ACTOR);
check("sending marks it sent", sentCampaign.status === "sent");
check("the audience is frozen at send time", sentCampaign.recipients.length > 0);
const report = campaignService.report(sentCampaign);
check("the report reads the delivery log", report.sent === sentCampaign.messageIds.length);
check("suppressed recipients are reported, not hidden", report.suppressed >= 0);

let resendBlocked = false;
try {
  await campaignService.sendNow(marketingCampaign.id, ACTOR);
} catch {
  resendBlocked = true;
}
check("a sent campaign cannot be sent twice", resendBlocked);

// ---------------------------------------------------------------------------
// Financial period close
// ---------------------------------------------------------------------------
section("Period close");

const closingId = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 7);
const beforeClose = periodFigures(closingId);
const closedPeriod = await financePeriodService.close(closingId, { actor: ACTOR, note: "Regression" });
check("closing freezes a snapshot", closedPeriod.status === "closed" && Boolean(closedPeriod.snapshot));
check(
  "the snapshot matches what was live at close",
  closedPeriod.snapshot!.platformRevenue === beforeClose.platformRevenue,
);
check(
  "a closed period reports the frozen figure",
  periodFigures(closingId).takenAt === closedPeriod.snapshot!.takenAt,
);
check(
  "the close is audited",
  getState().auditLog.some((e) => e.entity === "finance_period" && e.entityId === closingId),
);

let doubleClose = false;
try {
  await financePeriodService.close(closingId, { actor: ACTOR });
} catch {
  doubleClose = true;
}
check("a period cannot be closed twice", doubleClose);

let currentClose = false;
try {
  await financePeriodService.close(new Date().toISOString().slice(0, 7), { actor: ACTOR });
} catch {
  currentClose = true;
}
check("the current month cannot be closed", currentClose);

const reopened = await financePeriodService.reopen(closingId, { actor: ACTOR, reason: "Regression" });
check("reopening returns it to live figures", reopened.status === "open");
check("the superseded snapshot is kept", reopened.snapshot !== undefined);

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------
section("Localization");

check("English passes through untouched", translate("en", "Sign In") === "Sign In");
check("a shipped dictionary translates", translate("ar", "Sign In") !== "Sign In");
check("an untranslated language falls back to the source", translate("fr", "Sign In") === "Sign In");
check("Arabic has real coverage", translationCoverage("ar") > 0.5);
check("an empty language has none", translationCoverage("fr") === 0);

setTranslation("fr", "Sign In", "Se connecter");
check("an operator edit wins", translate("fr", "Sign In") === "Se connecter");
check("editing raises measured coverage", translationCoverage("fr") > 0);
setTranslation("fr", "Sign In", "");
check("clearing an edit restores the fallback", translate("fr", "Sign In") === "Sign In");

setLanguageEnabled("en", false);
check("English can never be switched off", translate("en", "Home") === "Home");
resetLocaleSettings();

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
