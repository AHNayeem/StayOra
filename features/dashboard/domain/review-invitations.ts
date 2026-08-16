/**
 * Review invitations — the scheduled half of the review system.
 *
 * Reviews could always be written; nothing ever asked for one. This sweep runs
 * after a stay completes and invites the traveller exactly once, skipping
 * anyone who has already reviewed that booking. The invitation itself goes
 * through the normal messaging layer, so it honours notification preferences
 * and lands in the delivery log with everything else.
 */

import { getState, mutate } from "./store";
import { send } from "./messaging";
import type { JobOutcome } from "./scheduler";

/** Wait this long after checkout before asking. */
const DELAY_HOURS = 24;
/** Stop asking after this. */
const WINDOW_DAYS = 30;

export function sweepReviewInvitations(nowMs = Date.now()): JobOutcome {
  const state = getState();
  const invited = new Set(state.reviewInvitations ?? []);
  const fresh: string[] = [];

  for (const booking of state.bookings) {
    if (booking.status !== "completed") continue;
    if (invited.has(booking.id)) continue;

    const endedMs = new Date(booking.endAt).getTime();
    const hoursSince = (nowMs - endedMs) / 3_600_000;
    if (hoursSince < DELAY_HOURS || hoursSince > WINDOW_DAYS * 24) continue;

    // Already reviewed — never ask twice.
    if (state.reviews.some((r) => r.bookingId === booking.id)) {
      fresh.push(booking.id);
      continue;
    }

    send({
      templateKey: "review_invite",
      to: { email: booking.customer.email },
      customerEmail: booking.customer.email,
      bookingId: booking.id,
      bookingRef: booking.reference,
      href: `/account/bookings/${booking.id}`,
      nowMs,
      context: {
        name: booking.customer.name.split(" ")[0],
        product: booking.productTitle,
        reference: booking.reference,
      },
    });
    fresh.push(booking.id);
  }

  if (fresh.length) {
    mutate((draft) => {
      draft.reviewInvitations = [...(draft.reviewInvitations ?? []), ...fresh];
    });
  }

  return {
    affected: fresh.length,
    summary: fresh.length ? `${fresh.length} invitation(s) sent` : "No stays awaiting a review",
  };
}
