import type { AppNotification, NotificationType } from "./types";

const ITEMS: [NotificationType, string, string][] = [
  ["booking", "New booking confirmed", "BK-1090 — Azure Bay Resort, 3 nights."],
  ["payment", "Payout sent", "$4,280 disbursed to Highline Group."],
  ["review", "New 5-star review", "“Flawless stay” on Cedarwood Lodge."],
  ["merchant", "Merchant awaiting approval", "Marina Living submitted verification."],
  ["system", "Scheduled maintenance", "Payments API upgrade on Sunday 02:00 UTC."],
  ["booking", "Booking cancelled", "BK-1077 cancelled by guest — refund pending."],
  ["payment", "Refund requested", "RFD-3312 for BK-1069 needs review."],
  ["review", "Review flagged", "A review on Palm Grove Villas was reported."],
  ["merchant", "Commission settled", "June commission settled for 8 merchants."],
  ["system", "New login", "Sign-in from a new device in Dubai."],
];

function iso(minuteOffset: number): string {
  return new Date(Date.UTC(2026, 6, 23, 14, 0) - minuteOffset * 60_000).toISOString();
}

export const NOTIFICATIONS_SEED: AppNotification[] = ITEMS.map(
  ([type, title, body], i) => ({
    id: `ntf_${800 + i}`,
    type,
    title,
    body,
    createdAt: iso(i * 47),
    // The four most recent are unread.
    read: i >= 4,
  }),
);
