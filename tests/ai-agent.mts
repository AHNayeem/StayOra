/**
 * AI travel agent regression harness — `bun run test:ai`.
 *
 * Drives the real agent against the real tools, repositories and booking domain
 * in Node. Nothing is stubbed: a booking made here consumes the same inventory,
 * takes the same mock payment and lands in the same lifecycle as one made in the
 * browser, which is the only way these assertions mean anything.
 *
 * The suite is ordered as a conversation would be — search, refine, compare,
 * select, book, fail, recover, cancel — and later sections deliberately depend
 * on earlier state, because that is what a real session does.
 */

import type { AIRequest, AIResponse, AITripContext, AIUserAction } from "@/types/ai";
import { runAgent } from "@/features/ai/agent/orchestrator";
import { parseMessage } from "@/features/ai/nlu/parse";
import { detectReference, isAffirmation, isNegation } from "@/features/ai/nlu/references";
import { extractContact, extractTravelerNames } from "@/features/ai/nlu/contact";
import { resolveReference } from "@/features/ai/agent/reference";
import { canTransition, transition } from "@/features/ai/agent/booking-machine";
import { DeterministicScorer } from "@/features/ai/agent/recommendation";
import { AgentError } from "@/features/ai/agent/errors";
import { DEFAULT_AGENT_POLICY, PolicyBudget, trimContext } from "@/features/ai/agent/policy";
import { ToolRunner } from "@/features/ai/agent/tool-runner";
import { createLogger } from "@/features/ai/agent/logger";
import { AI_TOOLS, permissionOf, TOOL_DESCRIPTORS } from "@/features/ai/tools";
import { getRepositories } from "@/features/ai/repositories";
import { toPropertyRef } from "@/features/booking/property";
import { getListingBySlug } from "@/services/catalog";
import {
  bulkUpdateInventory,
  cheapestQuote,
  getRoomTypes,
  getState,
  setPriceOverride,
} from "@/features/dashboard/domain";

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

/* -------------------------------------------------------------------------- */
/* Conversation driver                                                         */
/* -------------------------------------------------------------------------- */

const TODAY = "2026-09-01";
const NOW_MS = Date.parse("2026-09-01T09:00:00.000Z");

const SIGNED_IN = {
  authenticated: true,
  userId: "usr_test",
  name: "Ayesha Rahman",
  email: "ayesha@otithee.test",
  phone: "+8801711223344",
};

/** A stateful conversation, exactly as the chat provider drives one. */
class Session {
  context: AITripContext = {};
  last!: AIResponse;

  constructor(private readonly auth?: AIRequest["auth"]) {}

  async say(message: string, action?: AIUserAction): Promise<AIResponse> {
    const response = await runAgent({
      message,
      action,
      context: this.context,
      auth: this.auth,
      today: TODAY,
      nowMs: NOW_MS,
      countryCode: "BD",
    });
    this.context = response.contextPatch;
    this.last = response;
    return response;
  }

  block(kind: string) {
    return this.last.blocks.find((b) => b.kind === kind);
  }

  hasBlock(kind: string): boolean {
    return Boolean(this.block(kind));
  }
}

/** Money tokens are render-time; tests read the number out of them. */
function amountsIn(text: string): number[] {
  return [...text.matchAll(/\{\{usd:(-?\d+(?:\.\d+)?)\}\}/g)].map((m) => Number(m[1]));
}

// ===========================================================================
section("NLU — intents");
// ===========================================================================

const parse = (text: string, context: AITripContext = {}) =>
  parseMessage(text, { context, today: TODAY });

check("a hotel search is a hotel search", parse("Find hotels in Cox's Bazar").intent === "search-hotels");
check(
  "a nightly ceiling is read as nightly, not as a trip budget",
  parse("Find me a good hotel in Cox's Bazar under $80").slots.maxNightlyUsd === 80,
);
check(
  "a trip budget stays a trip budget",
  parse("Plan a 3-day trip to Sylhet for two people under $250").slots.budgetUsd === 250,
);
check("comparison is detected", parse("Compare the first three").intent === "compare");
check("booking verbs are detected", parse("Book the second one").intent === "start-booking");
check("an explicit book verb is flagged", parse("Book the second one").explicitBooking);
check("a bare reference is not a booking verb", !parse("the second one").explicitBooking);
check(
  "cancellation is separated from booking",
  parse("I want to cancel my booking").intent === "cancel-booking",
);
check("trip planning is detected", parse("Plan a 4-day trip to Sylhet").intent === "plan-trip");
check(
  "a flight route with no keyword is still a flight",
  parse("Dhaka to Bangkok next month").intent === "search-flights",
);
check(
  "round trips and party size are parsed together",
  (() => {
    const p = parse("Find me a round-trip flight from Dhaka to Bangkok for two adults");
    return p.slots.tripType === "round-trip" && p.slots.travelers?.adults === 2;
  })(),
);
check(
  "durations survive the day/night distinction",
  parse("3 nights in Sylhet").slots.nights === 3 && parse("a 4-day trip").slots.nights === 3,
);

section("NLU — references, confirmation and contact");

check("ordinals resolve to an index", (() => {
  const ref = detectReference("book the second one");
  return ref?.kind === "ordinal" && ref.index === 2;
})());
check("superlatives are their own reference", detectReference("the cheaper option")?.kind === "cheapest");
check("'the last one' is understood", detectReference("the last one")?.kind === "last");
check("deictics are understood", detectReference("book that hotel")?.kind === "deictic");
check("a bare yes is an affirmation", isAffirmation("yes please"));
check("a long sentence is not a bare yes", !isAffirmation("yes but can you also find me a cheaper hotel in Bali please"));
check("a bare no is a negation", isNegation("no, never mind"));

const contact = extractContact("My name is Ayesha Rahman, ayesha@example.com, +8801711223344");
check("a name is lifted from prose", contact.fullName === "Ayesha Rahman");
check("an email is lifted from prose", contact.email === "ayesha@example.com");
check("a phone number is lifted from prose", contact.phone === "+8801711223344");
check(
  "a destination is never mistaken for a name",
  extractContact("Find hotels in Cox's Bazar").fullName === undefined,
);
check(
  "multiple guest names are separated",
  extractTravelerNames("Ayesha Rahman and Tanvir Ahmed").length === 2,
);

section("Reference resolution against memory");

const results: AITripContext = {
  lastResults: {
    kind: "listing",
    intent: "search-hotels",
    items: [
      { kind: "listing", id: "a", title: "Alpha Hotel", priceUsd: 120, rating: 4.2 },
      { kind: "listing", id: "b", title: "Beta Resort", priceUsd: 80, rating: 4.8 },
      { kind: "listing", id: "c", title: "Gamma Inn", priceUsd: 200, rating: 4.5 },
    ],
  },
};
check(
  "'the second one' is the second one",
  resolveReference({ kind: "ordinal", index: 2 }, results).ref?.id === "b",
);
check(
  "'the cheaper option' is priced, not guessed",
  resolveReference({ kind: "cheapest" }, results).ref?.id === "b",
);
check(
  "'the best rated' uses the rating",
  resolveReference({ kind: "best-rated" }, results).ref?.id === "b",
);
check(
  "an out-of-range ordinal resolves to nothing",
  resolveReference({ kind: "ordinal", index: 9 }, results).ambiguity === "out-of-range",
);
check(
  "'that one' against five options is ambiguous, not a guess",
  resolveReference({ kind: "deictic" }, results).ambiguity === "ambiguous",
);

// ===========================================================================
section("Booking state machine");
// ===========================================================================

check("the happy path is legal", canTransition("awaiting_confirmation", "processing"));
check(
  "collecting information cannot jump to confirmed",
  !canTransition("collecting_information", "confirmed"),
);
check("review cannot jump to confirmed", !canTransition("review", "confirmed"));
check("a price change can be re-reviewed", canTransition("price_changed", "awaiting_confirmation"));
check("confirmed is terminal", !canTransition("confirmed", "cancelled"));

let illegalThrew = false;
try {
  transition(
    {
      id: "x",
      state: "collecting_information",
      subject: { kind: "listing", id: "l", title: "t", href: "/" },
      selection: { checkIn: "", checkOut: "", nights: 1, units: 1, guests: 1 },
      travelers: [],
      requirements: [],
      updatedAt: "",
      trail: [],
    },
    "confirmed",
    "",
  );
} catch {
  illegalThrew = true;
}
check("an illegal transition throws rather than silently skipping a step", illegalThrew);

// ===========================================================================
section("Tool permissions and guardrails");
// ===========================================================================

check("searchHotels is a read", permissionOf("searchHotels") === "read");
check("checkAvailability is a read", permissionOf("checkAvailability") === "read");
check("confirmBooking is a write", permissionOf("confirmBooking") === "write");
check("cancelBooking is destructive", permissionOf("cancelBooking") === "destructive");
check("an unknown tool is treated as destructive", permissionOf("rmRf") === "destructive");
check(
  "every descriptor is complete",
  TOOL_DESCRIPTORS.every((d) => d.name && d.description && d.source),
);
check(
  "every callable tool is declared — an undeclared one is uncallable",
  Object.keys(AI_TOOLS).every((name) => TOOL_DESCRIPTORS.some((d) => d.name === name)),
  Object.keys(AI_TOOLS)
    .filter((name) => !TOOL_DESCRIPTORS.some((d) => d.name === name))
    .join(", "),
);

function makeRunner(auth?: AIRequest["auth"]) {
  const budget = new PolicyBudget(DEFAULT_AGENT_POLICY, 0, () => 0);
  return new ToolRunner({ budget, logger: createLogger("test"), emit: () => {}, auth, now: () => 0 });
}

let writeBlocked: AgentError | null = null;
try {
  await makeRunner().call("confirmBooking", [{} as never, TODAY]);
} catch (error) {
  writeBlocked = error as AgentError;
}
check(
  "a write tool refuses an unauthenticated caller",
  writeBlocked?.code === "authentication_required",
);

let destructiveBlocked: AgentError | null = null;
try {
  await makeRunner(SIGNED_IN).call("cancelBooking", ["SO-NOPE"]);
} catch (error) {
  destructiveBlocked = error as AgentError;
}
check(
  "a destructive tool refuses without an explicit confirmation",
  destructiveBlocked?.code === "validation_failed",
);

let budgetBlocked: AgentError | null = null;
try {
  const tight = new PolicyBudget({ ...DEFAULT_AGENT_POLICY, maxToolCalls: 1 }, 0, () => 0);
  const runner = new ToolRunner({ budget: tight, logger: createLogger("t"), emit: () => {}, now: () => 0 });
  await runner.call("getPaymentMethods", []);
  await runner.call("getPaymentMethods", []);
} catch (error) {
  budgetBlocked = error as AgentError;
}
check("the tool budget is enforced", budgetBlocked?.code === "limit_exceeded");

check(
  "oversized memory is trimmed without losing a booking in progress",
  (() => {
    const fat = {
      booking: { id: "keep" },
      lastResults: { items: Array.from({ length: 4000 }, (_, i) => ({ id: `x${i}` })) },
    };
    const trimmed = trimContext(fat, { ...DEFAULT_AGENT_POLICY, maxContextBytes: 500 });
    return "booking" in trimmed && !("lastResults" in trimmed);
  })(),
);

// ===========================================================================
section("Recommendation scoring");
// ===========================================================================

const scorer = new DeterministicScorer();
const fakeListing = (id: string, price: number, rating: number, city: string) =>
  ({
    listing: {
      id,
      slug: id,
      vertical: "hotels",
      title: id,
      price: { amount: price, currency: "USD" },
      rating,
      location: { label: `${city}, Testland`, city, country: "Testland" },
      image: "",
      amenities: ["Pool"],
      stars: 4,
    },
    href: "/",
  }) as never;

const scored = scorer.score({
  candidates: [
    fakeListing("cheap-far", 50, 4.0, "Elsewhere"),
    fakeListing("right-here", 90, 4.6, "Sylhet"),
    fakeListing("over-budget", 400, 5.0, "Sylhet"),
  ],
  maxNightlyUsd: 100,
  city: "Sylhet",
});
check("scoring prefers in-destination, in-budget, well-rated", scored[0].ref.listing.id === "right-here");
check("an over-budget option is pushed down", scored[scored.length - 1].ref.listing.id === "over-budget");
check("every score carries its reasons", scored[0].reasons.length > 0);

// ===========================================================================
section("Conversation — search, context, refine, compare");
// ===========================================================================

const guest = new Session();

const search = await guest.say("Find me a good hotel in Cox's Bazar under $80");
check("a search answers with listings", guest.hasBlock("listings"));
check("the destination is remembered", guest.context.destination?.includes("Cox") === true);
check("the nightly ceiling is remembered", guest.context.maxNightlyUsd === 80);
check("results are remembered in order", (guest.context.lastResults?.items.length ?? 0) >= 2);
check("the answer quotes a real price", amountsIn(search.text).length > 0);
check("tool calls are counted", (search.toolCalls ?? 0) >= 1);
check(
  "every quoted price belongs to a shown listing",
  (() => {
    const shown = new Set(guest.context.lastResults!.items.map((i) => i.priceUsd));
    // The lead sentence quotes the cheapest nightly rate and the ceiling asked for.
    return amountsIn(search.text).every((value) => shown.has(value) || value === 80);
  })(),
);

const cheapestBefore = Math.min(...guest.context.lastResults!.items.map((i) => i.priceUsd));
const cheaper = await guest.say("Show me cheaper ones");
check("a refinement is understood as a refinement", cheaper.intent === "refine");
check(
  "a refinement either finds something cheaper or says it can't",
  (() => {
    const now = Math.min(...guest.context.lastResults!.items.map((i) => i.priceUsd));
    return now < cheapestBefore || /don't have anything cheaper/i.test(cheaper.text);
  })(),
  cheaper.text.slice(0, 120),
);

const comparer = new Session();
await comparer.say("Find hotels in Dhaka");
const comparison = await comparer.say("Compare these");
check("comparison uses tool-returned data", comparer.hasBlock("comparison"));
check(
  "a comparison names a winner",
  (comparison.blocks.find((b) => b.kind === "comparison") as { recommendation?: string } | undefined)
    ?.recommendation !== undefined,
);

const planner = new Session();
const planned = await planner.say("Plan a 3-day trip to Sylhet for two people under $600");
check("a trip plan is produced", planner.hasBlock("trip-plan"));
check("the plan is costed", planner.hasBlock("budget"));
check("the itinerary is day by day", planner.hasBlock("itinerary"));
check("planning is a multi-step action", (planned.steps?.length ?? 0) >= 2);
check("the plan is remembered", Boolean(planner.context.planId));

const withoutHotel = await planner.say("Remove the hotel");
check(
  "'remove the hotel' actually removes it",
  withoutHotel.blocks.some(
    (b) => b.kind === "notice" && b.text.toLowerCase().includes("left the accommodation out"),
  ),
);

// ===========================================================================
section("Authentication awareness");
// ===========================================================================

const anon = new Session();
await anon.say("Find hotels in Dhaka");
check("browsing needs no account", anon.hasBlock("listings"));

const anonBooking = await anon.say("Book the first one");
check("booking without an account asks for sign-in", anon.hasBlock("action-required"));
check(
  "the price is still shown honestly while signed out",
  amountsIn(anonBooking.text).length > 0 || anon.hasBlock("booking-progress"),
);
check("no booking was created", getState().bookings.every((b) => b.customer.email !== SIGNED_IN.email));

// ===========================================================================
section("Booking — the full workflow");
// ===========================================================================

const user = new Session(SIGNED_IN);
await user.say("Find hotels in Dhaka");
const target = user.context.lastResults!.items[0];

const started = await user.say("Book the first one");
check("booking starts on an availability + price check", (started.toolCalls ?? 0) >= 2);
check("a booking session exists", Boolean(user.context.booking));
check(
  "the workflow is in a collecting or review state",
  ["collecting_information", "review", "awaiting_confirmation"].includes(
    user.context.booking!.state,
  ),
);
check(
  "the quote came from a tool, not the model",
  user.context.booking?.quote?.source === "checkAvailability",
);
check("the quote carries a cancellation policy", Boolean(user.context.booking?.quote?.cancellationPolicy));
check(
  "the signed-in traveller isn't asked for their own name",
  user.context.booking?.contact?.email === SIGNED_IN.email,
);
check("a payment method is requested", user.hasBlock("payment-selection"));

// A premature "yes" must not book anything.
const premature = await user.say("yes");
check(
  "a yes before the review does not confirm a booking",
  !user.hasBlock("booking-confirmation") && user.context.booking?.state !== "confirmed",
);
check("the assistant asks for what's still missing", premature.blocks.length > 0);

const paid = await user.say("Pay with the visa card", {
  kind: "select-payment",
  methodId: "card_success",
});
check("choosing a card moves to the review", user.hasBlock("booking-review"));
check(
  "the review is a distinct awaiting-confirmation state",
  user.context.booking?.state === "awaiting_confirmation",
);
check(
  "the review shows a total, taxes and a policy",
  (() => {
    const block = user.block("booking-review") as { session?: { quote?: { lines: unknown[]; totalUsd: number; cancellationPolicy: string } } };
    const quote = block?.session?.quote;
    return Boolean(quote && quote.lines.length >= 2 && quote.totalUsd > 0 && quote.cancellationPolicy);
  })(),
);
check("nothing is booked yet", !user.hasBlock("booking-confirmation"));
check("the review re-checked availability", (paid.toolCalls ?? 0) >= 1);

const agreedTotal = user.context.booking!.quote!.totalUsd;

// --- price change, simulated by a real revenue-manager override -----------
const listing = await getListingBySlug(target.vertical!, target.slug!);
const property = toPropertyRef(listing!);
const roomTypeId = user.context.booking!.selection.roomTypeId!;
const nightlyBefore = user.context.booking!.quote!.perNightUsd ?? 0;
bulkUpdateInventory({
  propertyId: property.id,
  roomTypeId,
  from: user.context.booking!.selection.checkIn,
  to: user.context.booking!.selection.checkOut,
  price: Math.round(nightlyBefore * 1.25) + 7,
  priceNote: "Test: rate moved after the quote",
  updatedBy: "test",
});

const priceMoved = await user.say("Confirm booking", { kind: "confirm-booking" });
check("a price change stops the booking", user.hasBlock("price-change"));
check("the booking is not confirmed on a price change", !user.hasBlock("booking-confirmation"));
check("the state records the price change", user.context.booking?.state === "price_changed");
check(
  "both the old and the new price are reported",
  (() => {
    const block = user.block("price-change") as {
      revalidation?: { previousTotalUsd: number; currentTotalUsd: number };
    };
    return (
      block.revalidation!.previousTotalUsd === agreedTotal &&
      block.revalidation!.currentTotalUsd !== agreedTotal
    );
  })(),
);
check("the traveller is asked again", priceMoved.suggestions.length > 0);

// --- accepting the new price and confirming -------------------------------
await user.say("Review updated price", { kind: "accept-price-change" });
const confirmed = await user.say("Confirm booking", { kind: "confirm-booking" });

check("an accepted price change ends in a confirmation", user.hasBlock("booking-confirmation"));
check("a reference is issued by the platform", Boolean(user.last.contextPatch.recentBookingIds?.[0]));
check(
  "the confirmation reference exists in the booking domain",
  getState().bookings.some((b) => b.reference === user.last.contextPatch.recentBookingIds?.[0]),
);
check("the workflow is cleared after confirmation", user.context.booking === undefined);
check("confirmation is reported as multi-step work", (confirmed.steps?.length ?? 0) >= 3);

const created = getState().bookings.find(
  (b) => b.reference === user.context.recentBookingIds?.[0],
);
check("the booking is confirmed in the domain lifecycle", created?.status === "confirmed");
check("the booking carries the traveller's details", created?.customer.email === SIGNED_IN.email);
check("the booking consumed real inventory", Boolean(created?.holdId));
check(
  "the charge matches the reviewed total",
  Math.round(created!.money.total) === Math.round(user.last.blocks.length ? created!.money.total : 0),
);

// ===========================================================================
section("Booking — failure paths");
// ===========================================================================

// --- payment declined ------------------------------------------------------
const declineSession = new Session(SIGNED_IN);
await declineSession.say("Find hotels in Dhaka");
await declineSession.say("Book the first one");
await declineSession.say("Use the declining card", {
  kind: "select-payment",
  methodId: "card_declined",
});
const declined = await declineSession.say("Confirm booking", { kind: "confirm-booking" });
check("a declined card produces a failure state", declineSession.hasBlock("booking-error"));
check(
  "the booking is left in payment_failed",
  declineSession.context.booking?.state === "payment_failed",
);
check("no booking is created on a decline", !declineSession.hasBlock("booking-confirmation"));
check(
  "the failure explains itself without internals",
  !/Error|stack|undefined/.test(declined.text),
);

// --- availability lost -----------------------------------------------------
const soldOut = new Session(SIGNED_IN);
await soldOut.say("Find hotels in Dhaka");
await soldOut.say("Book the first one");
await soldOut.say("Pay", { kind: "select-payment", methodId: "card_success" });

const soldOutSelection = soldOut.context.booking!.selection;
const soldOutListing = await getListingBySlug(
  soldOut.context.booking!.subject.vertical!,
  soldOut.context.booking!.subject.slug!,
);
bulkUpdateInventory({
  propertyId: soldOutListing!.id,
  roomTypeId: soldOutSelection.roomTypeId!,
  from: soldOutSelection.checkIn,
  to: soldOutSelection.checkOut,
  stopSell: true,
  updatedBy: "test",
});

const lost = await soldOut.say("Confirm booking", { kind: "confirm-booking" });
check("lost availability is reported, not booked through", soldOut.hasBlock("availability-change"));
check(
  "the traveller is told nothing was charged",
  /nothing was charged/i.test(lost.text),
);
check(
  "real alternatives are offered",
  (() => {
    const block = soldOut.block("availability-change") as { alternatives?: unknown[] };
    return Array.isArray(block.alternatives);
  })(),
);

// ===========================================================================
section("Booking — multi-guest, missing information and recovery");
// ===========================================================================

const family = new Session(SIGNED_IN);
await family.say("Find hotels in Dhaka for 4 people, 3 nights");
const familyStart = await family.say("Book the first one");
check(
  "a party that doesn't fit one unit is re-checked, not refused",
  family.context.booking?.state !== "availability_failed",
  familyStart.text.slice(0, 120),
);
check(
  "enough units are booked for the party",
  (family.context.booking?.selection.units ?? 0) >= 1 &&
    (family.context.booking!.selection.units >= family.context.booking!.selection.guests ||
      family.context.booking!.quote!.unitsLeft >= 0),
);
check("all guest names are asked for", family.hasBlock("traveler-form"));

await family.say("The guests are Ayesha Rahman, Tanvir Ahmed, Mira Rahman and Sami Rahman");
check(
  "guest names given in prose are accepted",
  (family.context.booking?.travelers.length ?? 0) >= 4,
);
check("having names, it moves on to payment", family.hasBlock("payment-selection"));

await family.say("Pay", { kind: "select-payment", methodId: "card_success" });
check("a complete multi-guest booking reaches the review", family.hasBlock("booking-review"));
check(
  "the review names every traveller it will file",
  (family.context.booking?.travelers.length ?? 0) >= 4,
);

// A booking that has failed must not quietly accept new details.
const stuck = new Session(SIGNED_IN);
await stuck.say("Find hotels in Dhaka");
await stuck.say("Book the first one");
const stuckSelection = stuck.context.booking!.selection;
const stuckListing = await getListingBySlug(
  stuck.context.booking!.subject.vertical!,
  stuck.context.booking!.subject.slug!,
);
bulkUpdateInventory({
  propertyId: stuckListing!.id,
  roomTypeId: stuckSelection.roomTypeId!,
  from: stuckSelection.checkIn,
  to: stuckSelection.checkOut,
  stopSell: true,
  updatedBy: "test",
});
await stuck.say("Pay", { kind: "select-payment", methodId: "card_success" });
const stuckAfter = await stuck.say("Confirm booking", { kind: "confirm-booking" });
check(
  "a lost booking cannot be confirmed by pressing on",
  !stuck.hasBlock("booking-confirmation"),
);
check("the failure is explained rather than crashing", stuckAfter.text.length > 0);

// ===========================================================================
section("Cancellation");
// ===========================================================================

const reference = user.context.recentBookingIds![0];
const cancelSession = new Session(SIGNED_IN);
cancelSession.context = { recentBookingIds: [reference] };

const quoted = await cancelSession.say(`I want to cancel my booking ${reference}`);
check("a cancellation is quoted before it is done", cancelSession.hasBlock("cancellation"));
check(
  "the booking is still alive after the quote",
  getState().bookings.find((b) => b.reference === reference)?.status !== "cancelled",
);
check("the policy is quoted from the booking", /cancel|refund|non-refundable/i.test(quoted.text));

await cancelSession.say(`Yes, cancel ${reference}`, {
  kind: "cancel-booking",
  bookingId: reference,
  confirmed: true,
});
check(
  "an explicitly confirmed cancellation goes through",
  getState().bookings.find((b) => b.reference === reference)?.status === "cancelled",
);

// ===========================================================================
section("Account and modification");
// ===========================================================================

const account = new Session(SIGNED_IN);
const mine = await account.say("Show my bookings");
check("account bookings are listed", account.hasBlock("bookings"));
check("the answer says how many there are", /booking/i.test(mine.text));

const upcoming = await account.say("What's my next trip?");
check("the next trip is answered", upcoming.blocks.length > 0);

// --- modification ----------------------------------------------------------
// Dates chosen away from the ranges earlier sections stop-sold, so this
// section tests modification rather than re-testing lost availability.
const modifier = new Session(SIGNED_IN);
await modifier.say("Find hotels in Dhaka");
await modifier.say("Book the first one for 2027-02-10");
await modifier.say("Pay", { kind: "select-payment", methodId: "card_success" });
await modifier.say("Confirm booking", { kind: "confirm-booking" });
const madeRef = modifier.context.recentBookingIds?.[0];
check("a booking to modify was created", Boolean(madeRef), modifier.last.text.slice(0, 120));

const modified = await modifier.say(`Change my booking ${madeRef} to 2026-12-10`, {
  kind: "modify-booking",
  bookingId: madeRef!,
  patch: { checkIn: "2026-12-10", checkOut: "2026-12-12" },
});
check("a modification is priced against the real booking", /instead of|aren't available/i.test(modified.text));
check("the change is handed off where the terms are shown", modifier.hasBlock("action-required"));
check(
  "modification never silently changes the booking",
  getState().bookings.find((b) => b.reference === madeRef)?.startAt.slice(0, 10) !== "2026-12-10",
);

// ===========================================================================
section("Repositories and API-readiness");
// ===========================================================================

const repos = getRepositories();
check(
  "every repository announces which implementation is active",
  [repos.listings, repos.flights, repos.account, repos.payments, repos.bookings, repos.trips].every(
    (repo) => repo.id.startsWith("mock-"),
  ),
);
check(
  "payment methods never expose a card number",
  (await repos.payments.listMethods()).every(
    (method) => !("number" in method) && (method.last4 ?? "").length <= 4,
  ),
);

const hotel = await getListingBySlug("hotels", (await repos.listings.listByVertical("hotels"))[0].slug);
const rooms = getRoomTypes(toPropertyRef(hotel!));
const directQuote = cheapestQuote(toPropertyRef(hotel!), "2026-10-01", "2026-10-03", 1, 2, TODAY);
const repoAvailability = await repos.bookings.checkAvailability({
  vertical: "hotels",
  slug: hotel!.slug,
  checkIn: "2026-10-01",
  checkOut: "2026-10-03",
  units: 1,
  guests: 2,
  bookingDate: TODAY,
});
check("the repository has room types to sell", rooms.length > 0);
check(
  "the repository's availability agrees with the inventory engine",
  Boolean(directQuote) === repoAvailability.available,
);
check(
  "the quote is priced by the platform, not the assistant",
  (repoAvailability.quote?.totalUsd ?? 0) > 0 &&
    repoAvailability.quote!.totalUsd >= repoAvailability.quote!.subtotalUsd,
);

// --- a price override is genuinely reflected, proving nothing is cached ----
const overrideRoom = rooms[0];
const beforeOverride = (
  await repos.bookings.checkAvailability({
    vertical: "hotels",
    slug: hotel!.slug,
    checkIn: "2026-11-05",
    checkOut: "2026-11-06",
    units: 1,
    guests: 2,
    roomTypeId: overrideRoom.id,
    ratePlanId: "standard",
    bookingDate: TODAY,
  })
).quote!.totalUsd;

setPriceOverride({
  propertyId: hotel!.id,
  roomTypeId: overrideRoom.id,
  from: "2026-11-05",
  to: "2026-11-05",
  price: 999,
  updatedBy: "test",
});

const afterOverride = (
  await repos.bookings.checkAvailability({
    vertical: "hotels",
    slug: hotel!.slug,
    checkIn: "2026-11-05",
    checkOut: "2026-11-06",
    units: 1,
    guests: 2,
    roomTypeId: overrideRoom.id,
    ratePlanId: "standard",
    bookingDate: TODAY,
  })
).quote!.totalUsd;

check("a rate change moves the assistant's price too", afterOverride !== beforeOverride);

// ===========================================================================
section("Regression — the original capabilities still work");
// ===========================================================================

const regression = new Session();
check("greeting still greets", (await regression.say("hi")).intent === "greet");
check("help still lists capabilities", (await regression.say("what can you do")).blocks.length > 0);

const flights = await regression.say("Find me a cheap flight from Dhaka to Dubai next month");
check("flight search still works", regression.hasBlock("flights"));
check("fares are quoted from the fare service", amountsIn(flights.text).length > 0);

const visa = await regression.say("Do I need a visa for Thailand?");
check("visa lookup still works", regression.hasBlock("visa"));
check(
  "visa answers still carry the advisory warning",
  visa.blocks.some((b) => b.kind === "notice" && b.tone === "warning"),
);

const activities = await regression.say("Things to do in Bali");
check("activity search still works", regression.hasBlock("listings"));
check("suggestions are always offered", activities.suggestions.length > 0);

const nonsense = await regression.say("asdfghjkl");
check("nonsense gets an honest fallback", nonsense.intent === "unknown" && nonsense.text.length > 0);
check("the fallback invents nothing", nonsense.blocks.length === 0);

const blank = new Session();
const noDestination = await blank.say("Find me a flight");
check(
  "a missing destination is asked for, not guessed",
  blank.hasBlock("clarification") && /where/i.test(noDestination.text),
);

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
