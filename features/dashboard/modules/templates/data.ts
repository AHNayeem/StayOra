import type { NotificationTemplate, TemplateChannel } from "./types";

/** Deterministic seed epoch — fixed so the demo never drifts with wall-clock. */
const EPOCH = Date.UTC(2026, 6, 1, 9, 0);

function iso(dayOffset: number): string {
  return new Date(EPOCH - dayOffset * 86_400_000).toISOString();
}

type Seed = [
  name: string,
  key: string,
  channel: TemplateChannel,
  subject: string,
  body: string,
  description: string,
  enabled: boolean,
];

const SEED: Seed[] = [
  [
    "Booking confirmation",
    "booking.confirmed",
    "email",
    "Your stay at {{property_name}} is confirmed",
    "Hi {{guest_name}},\n\nYour booking {{booking_ref}} is confirmed for {{check_in}} – {{check_out}}. We can't wait to host you.",
    "Sent to the guest the moment a booking is confirmed.",
    true,
  ],
  [
    "Booking cancelled",
    "booking.cancelled",
    "email",
    "Your booking {{booking_ref}} was cancelled",
    "Hi {{guest_name}},\n\nYour booking {{booking_ref}} has been cancelled. Any eligible refund of {{refund_amount}} is on its way.",
    "Confirms a cancellation and any refund to the guest.",
    true,
  ],
  [
    "Payment receipt",
    "payment.succeeded",
    "email",
    "Receipt for {{amount}} — {{property_name}}",
    "Thanks {{guest_name}}, we've received {{amount}} for booking {{booking_ref}}. Your receipt is attached.",
    "Emails a receipt after a successful charge.",
    true,
  ],
  [
    "Payout sent",
    "payout.sent",
    "email",
    "A payout of {{amount}} is on its way",
    "Hi {{merchant_name}},\n\nWe've sent a payout of {{amount}} to your account ending {{bank_last4}}.",
    "Notifies merchants when a payout is released.",
    true,
  ],
  [
    "Refund processed",
    "refund.processed",
    "email",
    "Your refund of {{amount}} has been processed",
    "Hi {{guest_name}},\n\nA refund of {{amount}} for booking {{booking_ref}} has been processed and should appear within 5–10 days.",
    "Confirms a completed refund to the guest.",
    true,
  ],
  [
    "Password reset",
    "auth.password_reset",
    "email",
    "Reset your Otithee password",
    "Use the link below to reset your password. It expires in 30 minutes.\n\n{{reset_link}}",
    "Delivers the password-reset link.",
    true,
  ],
  [
    "Check-in reminder",
    "booking.checkin_reminder",
    "sms",
    "",
    "Hi {{guest_name}}, check-in for {{property_name}} is tomorrow at {{check_in_time}}. Ref {{booking_ref}}.",
    "Texts the guest the day before check-in.",
    true,
  ],
  [
    "OTP code",
    "auth.otp",
    "sms",
    "",
    "Your Otithee verification code is {{otp_code}}. It expires in 5 minutes.",
    "Sends the one-time login/verification code.",
    true,
  ],
  [
    "Booking confirmed (SMS)",
    "booking.confirmed_sms",
    "sms",
    "",
    "Booking {{booking_ref}} confirmed for {{check_in}}. Manage it at {{manage_link}}.",
    "Short SMS confirmation for guests who opt in.",
    false,
  ],
  [
    "New booking alert",
    "merchant.new_booking",
    "push",
    "",
    "New booking {{booking_ref}} for {{property_name}} — {{amount}}.",
    "Pushes merchants a heads-up on each new booking.",
    true,
  ],
  [
    "Review request",
    "booking.review_request",
    "push",
    "",
    "How was your stay at {{property_name}}? Tap to leave a review.",
    "Prompts guests for a review after checkout.",
    true,
  ],
  [
    "Price drop",
    "wishlist.price_drop",
    "push",
    "",
    "Good news — {{property_name}} on your wishlist just dropped to {{amount}}.",
    "Alerts guests when a saved stay gets cheaper.",
    false,
  ],
];

export const TEMPLATES_SEED: NotificationTemplate[] = SEED.map(
  ([name, key, channel, subject, body, description, enabled], i) => ({
    id: `tpl_${400 + i}`,
    name,
    key,
    channel,
    subject,
    body,
    description,
    enabled,
    updatedAt: iso(i * 2),
  }),
);
