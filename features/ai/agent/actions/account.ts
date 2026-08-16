/**
 * Account actions — the traveller's own trips.
 *
 * Reporting is free; changing anything is not. "Show my bookings" answers
 * straight away, while a cancellation is routed to the booking actions where it
 * has to pass a destructive-tool confirmation first.
 */

import type { AIBlock } from "@/types/ai";
import type { ActionContext, ActionResult } from "../shared";

export async function listBookings(ctx: ActionContext): Promise<ActionResult> {
  const { context, parsed } = ctx;
  const wantsNext = /next trip|upcoming|what.s next/.test(parsed.text);
  const keyword = parsed.bookingReference ?? extractBookingKeyword(parsed.text);

  const [result, made] = await Promise.all([
    wantsNext || keyword
      ? ctx.tools.call("getTripDetails", [keyword])
      : ctx.tools.call("getUserBookings", []),
    // Bookings taken through this assistant (or the checkout) live in the
    // booking domain, not in the account's seeded dataset — so they have to be
    // read separately or a traveller wouldn't see what they just booked.
    ctx.auth?.email
      ? ctx.tools.call("listBookingRecords", [ctx.auth.email])
      : Promise.resolve([]),
  ]);

  if (result.stays.length === 0 && result.flights.length === 0 && made.length === 0) {
    return {
      text: keyword
        ? `I couldn't find a booking matching “${keyword}”. Your bookings live under Account → Bookings if you'd like to check the reference.`
        : "You don't have any bookings on this account yet. Shall I help you plan a trip?",
      blocks: [],
      suggestions: ["Plan my next trip", "Find the cheapest flight", "Find a family hotel"],
      contextPatch: context,
    };
  }

  const next = result.stays.find((b) => b.status === "upcoming");
  const askedAboutCancelling = /cancel/.test(parsed.text);

  const blocks: AIBlock[] = [];

  if (made.length > 0) {
    blocks.push({
      kind: "booking-records",
      title: "Booked with me",
      records: made.slice(0, 4),
    });
  }

  if (result.stays.length > 0 || result.flights.length > 0) {
    blocks.push({
      kind: "bookings",
      title: wantsNext ? "Coming up next" : "Your bookings",
      stays: result.stays,
      flights: result.flights,
    });
  }

  if (askedAboutCancelling && next) {
    // The policy text is quoted from the booking, never paraphrased — a refund
    // the assistant invented would be the most damaging sentence it could write.
    blocks.push({
      kind: "notice",
      tone: "info",
      text: `${next.cancellationPolicy} Tell me the reference and I'll price the refund exactly before anything is cancelled.`,
    });
  }

  const shown = result.stays.length + result.flights.length + Math.min(made.length, 4);
  const total = result.total + made.length;
  const summary =
    total > shown
      ? `Showing ${shown} of your ${total} bookings — the rest are under Account → Bookings.`
      : `You have ${total} booking${total === 1 ? "" : "s"} on this account.`;

  // Loyalty standing, when the account has any. Read from the tool rather than
  // remembered, so a tier that changed since the last turn is the one quoted.
  const profile = ctx.auth?.authenticated ? await ctx.tools.call("getUserProfile", []) : null;
  const standing =
    profile?.membership && profile.points !== undefined
      ? ` You're ${profile.membership} with ${profile.points.toLocaleString()} points.`
      : "";

  // Booking dates are stored as full ISO timestamps; travellers want the day.
  const day = (iso: string) => iso.slice(0, 10);
  const text =
    wantsNext && next
      ? `Your next trip is ${next.title} in ${next.location}, ${day(next.checkIn)} to ${day(next.checkOut)} (${next.reference}).`
      : next
        ? `${summary} Next up: ${next.title} in ${next.location} on ${day(next.checkIn)} (${next.reference}).`
        : summary;

  return {
    text: `${text}${standing}`,
    blocks,
    suggestions: [
      "What's my next trip?",
      // Only offer to cancel something this assistant can actually cancel.
      // Bookings from the wider account live outside the booking domain, and a
      // chip that dead-ends is worse than no chip.
      made[0] ? `Cancel ${made[0].reference}` : "Plan my next trip",
      next ? `Things to do in ${next.location.split(",")[0]}` : "Find a family hotel",
    ],
    contextPatch: {
      ...context,
      // Same reason: "cancel it" later has to resolve to a real, actionable id.
      recentBookingIds: made.length
        ? [...made.map((r) => r.reference), ...(context.recentBookingIds ?? [])].slice(0, 5)
        : context.recentBookingIds,
    },
  };
}

/** Pull a destination/reference keyword out of "show my Dubai booking". */
function extractBookingKeyword(text: string): string | undefined {
  const match = text.match(
    /(?:my|the)\s+([a-z0-9\s-]{3,24}?)\s+(?:booking|trip|reservation|stay|flight)/,
  );
  const keyword = match?.[1]?.trim();
  if (!keyword) return undefined;
  if (["next", "last", "first", "upcoming", "recent"].includes(keyword)) return undefined;
  return keyword;
}
