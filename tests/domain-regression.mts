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
  bookingService,
  checkAvailability,
  cheapestQuote,
  couponService,
  getHold,
  getRoomTypes,
  getState,
  holdInventory,
  loyaltyService,
  quoteRefund,
  quoteStay,
  releaseHold,
  supportService,
  sweepExpiredHolds,
  type PropertyRef,
} from "@/features/dashboard/domain";
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
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
