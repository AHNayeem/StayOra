/**
 * The dispute dataset — derived from real bookings.
 *
 * The old stub invented merchant and customer *names*; these cases point at
 * booking ids that exist, so opening a dispute in the admin screen and seeing it
 * on the merchant's own list is the same record, not a coincidence of strings.
 */

import type { Booking } from "./types";
import type { Dispute, DisputeReason, DisputeStatus } from "./disputes";

const REF = Date.UTC(2026, 7, 11);
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(REF - daysAgo * DAY).toISOString();

const REASONS: DisputeReason[] = [
  "fraudulent",
  "product_not_received",
  "not_as_described",
  "duplicate",
  "subscription_canceled",
];

const CLAIMS: Record<DisputeReason, string> = {
  fraudulent: "The cardholder says they did not authorise this booking.",
  product_not_received: "The guest says the stay was unavailable on arrival.",
  not_as_described: "The guest says the room did not match the listing photos.",
  duplicate: "The cardholder says they were charged twice for one booking.",
  subscription_canceled: "The guest says they cancelled inside the free window and were still charged.",
};

const STATUS_CYCLE: DisputeStatus[] = [
  "needs_response",
  "merchant_responded",
  "under_review",
  "won",
  "needs_response",
  "lost",
  "accepted",
];

/**
 * One dispute per eligible booking, capped at twelve — enough to fill the queue
 * and the merchant's list without burying the rest of the dataset.
 */
export function buildDisputes(bookings: Booking[]): Dispute[] {
  const eligible = bookings.filter(
    (b) => b.status === "completed" || b.status === "confirmed" || b.status === "refunded",
  );

  return eligible.slice(0, 12).map((booking, i) => {
    const reason = REASONS[i % REASONS.length];
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const openedDaysAgo = 2 + i * 3;
    const decided = status === "won" || status === "lost" || status === "accepted";

    const timeline: Dispute["timeline"] = [
      {
        id: `dspe_seed_${i}_1`,
        at: iso(openedDaysAgo),
        status: "needs_response",
        label: "Dispute opened",
        actor: "Issuing bank",
        note: CLAIMS[reason],
      },
    ];
    if (status !== "needs_response") {
      timeline.push({
        id: `dspe_seed_${i}_2`,
        at: iso(openedDaysAgo - 1),
        status: "merchant_responded",
        label: "Merchant responded",
        actor: booking.merchant.name,
        note: "Booking confirmation, check-in record and guest correspondence attached.",
      });
    }
    if (decided) {
      timeline.push({
        id: `dspe_seed_${i}_3`,
        at: iso(Math.max(0, openedDaysAgo - 3)),
        status,
        label:
          status === "won"
            ? "Won — chargeback reversed"
            : status === "lost"
              ? "Lost — chargeback stands"
              : "Merchant accepted liability",
        actor: status === "accepted" ? booking.merchant.name : "Disputes Team",
      });
    }

    return {
      id: `dsp_${600 + i}`,
      reference: `DSP-${7100 + i}`,
      bookingId: booking.id,
      bookingRef: booking.reference,
      merchantId: booking.merchant.id,
      merchantName: booking.merchant.name,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      segment: booking.segment,
      reason,
      claim: CLAIMS[reason],
      amount: booking.money.total,
      currency: booking.money.currency,
      status,
      openedAt: iso(openedDaysAgo),
      dueAt: iso(openedDaysAgo - 7),
      merchantResponse:
        status === "needs_response"
          ? undefined
          : "The guest checked in and stayed the full booking. Confirmation and folio attached.",
      respondedAt: status === "needs_response" ? undefined : iso(openedDaysAgo - 1),
      evidence:
        status === "needs_response"
          ? []
          : [
              {
                id: `dspv_seed_${i}_1`,
                label: "Booking confirmation",
                fileName: `${booking.reference}-confirmation.pdf`,
                addedAt: iso(openedDaysAgo - 1),
                addedBy: booking.merchant.name,
              },
              {
                id: `dspv_seed_${i}_2`,
                label: "Check-in record",
                fileName: `${booking.reference}-checkin.pdf`,
                addedAt: iso(openedDaysAgo - 1),
                addedBy: booking.merchant.name,
              },
            ],
      decidedAt: decided ? iso(Math.max(0, openedDaysAgo - 3)) : undefined,
      decidedBy: decided && status !== "accepted" ? "Disputes Team" : undefined,
      timeline,
    } satisfies Dispute;
  });
}
