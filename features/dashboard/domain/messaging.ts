/**
 * Mock communication layer — email, SMS, push and WhatsApp.
 *
 * No provider is contacted. Every "send" renders a template against a context
 * and appends an {@link OutboundMessage} to a delivery log, then walks it
 * through queued → sent → delivered (or fails it, when the demo asks for that).
 * The customer's in-app inbox reads the same log, so a booking confirmation the
 * admin can see in the delivery report is literally the message the traveller
 * received.
 *
 * Replacing this with Postmark/Twilio/FCM means reimplementing `dispatch` — the
 * template registry, the preference checks and the log all stay.
 */

import { hashString } from "@/lib/random";
import { platformConfig } from "./platform-config";
import { getState, mutate, nextId } from "./store";

export const CHANNELS = ["email", "sms", "push", "whatsapp", "inapp"] as const;
export type MessageChannel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
  whatsapp: "WhatsApp",
  inapp: "In-app",
};

export type MessageCategory =
  | "booking"
  | "payment"
  | "refund"
  | "reminder"
  | "review"
  | "support"
  | "security"
  | "marketing";

export const CATEGORY_LABELS: Record<MessageCategory, string> = {
  booking: "Booking updates",
  payment: "Payments",
  refund: "Refunds",
  reminder: "Trip reminders",
  review: "Review invitations",
  support: "Support",
  security: "Security & sign-in",
  marketing: "Offers & inspiration",
};

export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed" | "bounced";

export interface OutboundMessage {
  id: string;
  templateKey: string;
  channel: MessageChannel;
  category: MessageCategory;
  /** Email address, phone or device label — whatever the channel addresses. */
  to: string;
  customerEmail?: string;
  subject: string;
  body: string;
  status: DeliveryStatus;
  createdAt: string;
  /** When the simulated provider accepted it off the queue. */
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
  bookingId?: string;
  bookingRef?: string;
  href?: string;
  /** True for messages the admin composed by hand. */
  manual?: boolean;
  /**
   * Always true in the prototype: no provider was contacted. Kept explicit on
   * the record so the delivery log can label simulated sends rather than
   * implying a customer received something.
   */
  simulated?: boolean;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface MessageTemplate {
  key: string;
  name: string;
  category: MessageCategory;
  /** Channels this template is defined for. */
  channels: MessageChannel[];
  subject: string;
  /** `{{token}}` placeholders resolved from the send context. */
  body: string;
  /** Short SMS/push variant; falls back to `body`. */
  short?: string;
}

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: "booking_confirmed",
    name: "Booking confirmation",
    category: "booking",
    channels: ["email", "sms", "push", "whatsapp", "inapp"],
    subject: "Your booking {{reference}} is confirmed",
    body: "Hi {{name}}, your booking at {{product}} is confirmed.\n\nReference: {{reference}}\nDates: {{dates}}\nTotal: {{total}}\n\nYou can view, change or cancel it any time from your account.",
    short: "{{product}} is confirmed. Ref {{reference}}, {{dates}}.",
  },
  {
    key: "payment_received",
    name: "Payment receipt",
    category: "payment",
    channels: ["email", "inapp"],
    subject: "Receipt for {{reference}} — {{total}}",
    body: "We've received {{total}} for booking {{reference}}.\n\nPaid with {{instrument}}\nTransaction {{txn}}\n\nYour invoice is attached to the booking in your account.",
  },
  {
    key: "payment_failed",
    name: "Payment failed",
    category: "payment",
    channels: ["email", "sms", "push", "inapp"],
    subject: "We couldn't take payment for {{reference}}",
    body: "Hi {{name}}, the payment for {{product}} didn't go through ({{reason}}).\n\nYour dates are held for a short while — retry from your booking to keep them.",
    short: "Payment failed for {{reference}}. Retry to keep your dates.",
  },
  {
    key: "otp",
    name: "One-time code",
    category: "security",
    channels: ["sms", "email", "whatsapp"],
    subject: "Your Otithee code",
    body: "Your verification code is {{code}}. It expires in 10 minutes. If this wasn't you, ignore this message.",
    short: "Otithee code: {{code}} (expires in 10 min)",
  },
  {
    key: "password_reset",
    name: "Password reset",
    category: "security",
    channels: ["email"],
    subject: "Reset your Otithee password",
    body: "Hi {{name}}, use the link in this email to choose a new password. The link is valid for 30 minutes.",
  },
  {
    key: "cancellation_confirmed",
    name: "Cancellation confirmed",
    category: "booking",
    channels: ["email", "sms", "inapp"],
    subject: "Booking {{reference}} cancelled",
    body: "Your booking at {{product}} has been cancelled.\n\nRefund due: {{refund}}\nCancellation fee: {{fee}}\n\nRefunds are returned to the original payment method.",
    short: "{{reference}} cancelled. Refund due {{refund}}.",
  },
  {
    key: "refund_processed",
    name: "Refund processed",
    category: "refund",
    channels: ["email", "sms", "inapp"],
    subject: "Your refund of {{refund}} is on its way",
    body: "We've sent {{refund}} back to your original payment method for booking {{reference}}. Banks usually take 5–10 working days to post it.",
    short: "Refund of {{refund}} sent for {{reference}}.",
  },
  {
    key: "date_change",
    name: "Dates changed",
    category: "booking",
    channels: ["email", "inapp"],
    subject: "New dates for {{reference}}",
    body: "Your booking at {{product}} has been moved to {{dates}}. Everything else stays the same.",
  },
  {
    key: "pre_arrival",
    name: "Pre-arrival reminder",
    category: "reminder",
    channels: ["email", "push", "whatsapp", "inapp"],
    subject: "See you soon at {{product}}",
    body: "Your stay starts {{dates}}. Check-in from 3pm — here's what to know:\n\n• Reference {{reference}}\n• Bring photo ID for every guest\n• Message the property from your booking if you'll arrive late.",
    short: "Your stay at {{product}} starts {{dates}}. Ref {{reference}}.",
  },
  {
    key: "review_invite",
    name: "Review invitation",
    category: "review",
    channels: ["email", "push", "inapp"],
    subject: "How was {{product}}?",
    body: "Hi {{name}}, thanks for staying at {{product}}. A short review helps other travellers — and earns you loyalty points.",
    short: "How was {{product}}? Leave a review and earn points.",
  },
  {
    key: "abandoned_checkout",
    name: "Abandoned checkout nudge",
    category: "marketing",
    channels: ["email", "push", "inapp"],
    subject: "Your dates at {{product}} are still available",
    body: "Hi {{name}}, you were a step away from booking {{product}} for {{dates}} ({{total}}).\n\nWe've kept your selection — pick up where you left off and the same room, rate and dates are waiting.",
    short: "Still thinking about {{product}}? Your dates are available.",
  },
  {
    key: "waitlist_available",
    name: "Waitlist opening",
    category: "booking",
    channels: ["email", "push", "sms", "inapp"],
    subject: "{{room}} at {{product}} just opened up",
    body: "Good news — {{room}} at {{product}} is available again for {{dates}}.\n\nWaitlist openings go quickly, so book soon to secure it.",
    short: "{{room}} at {{product}} is free for {{dates}}. Book now.",
  },
  {
    key: "marketing_broadcast",
    name: "Marketing broadcast",
    category: "marketing",
    channels: ["email", "sms", "push", "inapp"],
    subject: "{{subject}}",
    body: "{{body}}",
    short: "{{subject}}",
  },
  {
    key: "supplier_pending",
    name: "Awaiting supplier confirmation",
    category: "booking",
    channels: ["email", "inapp"],
    subject: "We're confirming {{reference}} with the supplier",
    body: "Hi {{name}}, we've received your request for {{product}} and are confirming it with the supplier. You'll hear from us within a few hours — nothing is charged until they accept.",
  },
  {
    key: "support_reply",
    name: "Support reply",
    category: "support",
    channels: ["email", "push", "inapp"],
    subject: "Re: {{subject}}",
    body: "{{body}}",
  },
];

export function findTemplate(key: string): MessageTemplate | undefined {
  return MESSAGE_TEMPLATES.find((t) => t.key === key);
}

/** Fill `{{token}}` placeholders; unknown tokens are left visible on purpose. */
export function render(text: string, ctx: Record<string, string | number | undefined>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
    const value = ctx[token];
    return value === undefined || value === "" ? match : String(value);
  });
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export type NotificationPreferences = Record<MessageChannel, Record<MessageCategory, boolean>>;

function defaultPreferences(): NotificationPreferences {
  const on = (marketing: boolean): Record<MessageCategory, boolean> => ({
    booking: true,
    payment: true,
    refund: true,
    reminder: true,
    review: true,
    support: true,
    security: true,
    marketing,
  });
  return {
    email: on(true),
    sms: { ...on(false), review: false },
    push: on(false),
    whatsapp: { ...on(false), review: false, payment: false },
    inapp: on(true),
  };
}

export function getPreferences(email: string): NotificationPreferences {
  const stored = getState().notificationPreferences[email.toLowerCase()];
  if (!stored) return defaultPreferences();
  const base = defaultPreferences();
  for (const channel of CHANNELS) {
    base[channel] = { ...base[channel], ...(stored[channel] ?? {}) };
  }
  return base;
}

export function setPreference(
  email: string,
  channel: MessageChannel,
  category: MessageCategory,
  enabled: boolean,
): void {
  const key = email.toLowerCase();
  mutate((draft) => {
    const current = draft.notificationPreferences[key] ?? defaultPreferences();
    current[channel] = { ...current[channel], [category]: enabled };
    draft.notificationPreferences[key] = current;
  });
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export interface SendInput {
  templateKey: string;
  channels?: MessageChannel[];
  to: { email?: string; phone?: string; device?: string };
  customerEmail?: string;
  context: Record<string, string | number | undefined>;
  bookingId?: string;
  bookingRef?: string;
  href?: string;
  /** Force a delivery outcome — the admin "send test" and failure demos use it. */
  forceStatus?: DeliveryStatus;
  manual?: boolean;
  /** Bypass the customer's preferences (transactional/security messages). */
  ignorePreferences?: boolean;
  nowMs?: number;
}

function addressFor(channel: MessageChannel, to: SendInput["to"]): string | undefined {
  switch (channel) {
    case "email":
      return to.email;
    case "sms":
    case "whatsapp":
      return to.phone;
    case "push":
      return to.device ?? (to.email ? `${to.email} · app` : undefined);
    case "inapp":
      return to.email;
  }
}

/**
 * Render and "send" a template on every eligible channel. Returns the messages
 * that were created — one per channel — already in their final status.
 */
export function send(input: SendInput): OutboundMessage[] {
  const template = findTemplate(input.templateKey);
  if (!template) return [];

  const nowMs = input.nowMs ?? Date.now();
  const at = new Date(nowMs).toISOString();
  const prefs = input.customerEmail ? getPreferences(input.customerEmail) : null;
  const channels = (input.channels ?? template.channels).filter((c) =>
    template.channels.includes(c),
  );

  const created: OutboundMessage[] = [];

  for (const channel of channels) {
    const to = addressFor(channel, input.to);
    if (!to) continue;
    if (
      !input.ignorePreferences &&
      prefs &&
      channel !== "inapp" &&
      !prefs[channel][template.category]
    ) {
      continue;
    }

    const short = channel === "sms" || channel === "push" || channel === "whatsapp";
    // An in-app message is delivered the moment it is written — there is no
    // carrier in between. Everything else enters the queue and is progressed by
    // `advanceDeliveries` on the scheduler's tick, which is what makes the
    // delivery report a lifecycle rather than a claim.
    const simulate = platformConfig().delivery.simulate && channel !== "inapp";
    const message: OutboundMessage = {
      id: nextId("msg"),
      templateKey: template.key,
      channel,
      category: template.category,
      to,
      customerEmail: input.customerEmail,
      subject: render(template.subject, input.context),
      body: render(short && template.short ? template.short : template.body, input.context),
      status: input.forceStatus ?? (simulate ? "queued" : "delivered"),
      createdAt: at,
      bookingId: input.bookingId,
      bookingRef: input.bookingRef,
      href: input.href,
      manual: input.manual,
      simulated: true,
    };
    if (message.status === "delivered" || message.status === "read") {
      message.sentAt = at;
      message.deliveredAt = at;
    }
    if (message.status === "sent") message.sentAt = at;
    if (message.status === "failed" || message.status === "bounced") {
      message.failureReason =
        channel === "email" ? "Mailbox unavailable (simulated)" : "Handset unreachable (simulated)";
    }
    created.push(message);
  }

  if (created.length) mutate((draft) => draft.outbox.unshift(...created));
  return created.map((m) => structuredClone(m));
}

// ---------------------------------------------------------------------------
// Simulated delivery lifecycle
// ---------------------------------------------------------------------------

export interface DeliverySweepResult {
  sent: number;
  delivered: number;
  failed: number;
}

/**
 * Advance queued messages through the simulated provider.
 *
 * `queued → sent` after one step, `sent → delivered` after another; a
 * configurable share bounces instead, so failure handling is demonstrable. The
 * outcome is decided by a hash of the message id, which keeps a given demo
 * deterministic — the same message always fails, and a re-run of the sweep
 * cannot flip a delivered message to failed.
 *
 * The scheduler calls this every tick (`delivery:progress`). Nothing here talks
 * to a provider; `simulated: true` on every record is what the delivery log
 * surfaces so no one mistakes it for real delivery.
 */
export function advanceDeliveries(nowMs = Date.now()): DeliverySweepResult {
  const { simulate, failureRatePercent, stepSeconds } = platformConfig().delivery;
  const result: DeliverySweepResult = { sent: 0, delivered: 0, failed: 0 };
  if (!simulate) return result;

  const stepMs = Math.max(1, stepSeconds) * 1000;
  const now = new Date(nowMs).toISOString();

  mutate((draft) => {
    for (const message of draft.outbox) {
      if (message.status === "queued") {
        const queuedFor = nowMs - new Date(message.createdAt).getTime();
        if (queuedFor < stepMs) continue;
        // Deterministic per message: 0–99.
        const roll = hashString(message.id) % 100;
        if (roll < failureRatePercent) {
          message.status = message.channel === "email" ? "bounced" : "failed";
          message.failureReason =
            message.channel === "email"
              ? "Mailbox unavailable (simulated)"
              : "Handset unreachable (simulated)";
          result.failed += 1;
        } else {
          message.status = "sent";
          message.sentAt = now;
          result.sent += 1;
        }
        continue;
      }
      if (message.status === "sent") {
        const sentFor = nowMs - new Date(message.sentAt ?? message.createdAt).getTime();
        if (sentFor < stepMs) continue;
        message.status = "delivered";
        message.deliveredAt = now;
        result.delivered += 1;
      }
    }
  });

  return result;
}

/** Re-queue a failed message — the "retry" action on the delivery report. */
export function retryDelivery(id: string, nowMs = Date.now()): OutboundMessage | undefined {
  return mutate((draft) => {
    const message = draft.outbox.find((m) => m.id === id);
    if (!message) return undefined;
    if (message.status !== "failed" && message.status !== "bounced") return message;
    message.status = "queued";
    message.createdAt = new Date(nowMs).toISOString();
    message.failureReason = undefined;
    message.sentAt = undefined;
    // Give the retry a fresh id-derived roll, or a permanently-failing message
    // would fail again forever.
    message.id = `${message.id}r`;
    return structuredClone(message);
  });
}

/** How many messages are waiting in the simulated queue. */
export function queuedCount(): number {
  return getState().outbox.filter((m) => m.status === "queued").length;
}

/** Preview a template without sending anything. */
export function preview(
  templateKey: string,
  channel: MessageChannel,
  context: Record<string, string | number | undefined>,
): { subject: string; body: string } | null {
  const template = findTemplate(templateKey);
  if (!template) return null;
  const short = channel === "sms" || channel === "push" || channel === "whatsapp";
  return {
    subject: render(template.subject, context),
    body: render(short && template.short ? template.short : template.body, context),
  };
}

export const messagingService = {
  send,
  preview,
  advanceDeliveries,
  retryDelivery,
  queuedCount,
  getPreferences,
  setPreference,

  /** Full delivery log (admin). */
  log(filter: { channel?: MessageChannel; status?: DeliveryStatus } = {}): OutboundMessage[] {
    return getState()
      .outbox.filter(
        (m) =>
          (!filter.channel || m.channel === filter.channel) &&
          (!filter.status || m.status === filter.status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** The customer's in-app inbox. */
  inbox(email: string): OutboundMessage[] {
    const key = email.toLowerCase();
    return getState()
      .outbox.filter((m) => m.channel === "inapp" && m.customerEmail?.toLowerCase() === key)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  unreadCount(email: string): number {
    return messagingService.inbox(email).filter((m) => m.status !== "read").length;
  },

  markRead(id: string, at = new Date().toISOString()): void {
    mutate((draft) => {
      const message = draft.outbox.find((m) => m.id === id);
      if (message && message.status !== "read") {
        message.status = "read";
        message.readAt = at;
      }
    });
  },

  markAllRead(email: string, at = new Date().toISOString()): void {
    const key = email.toLowerCase();
    mutate((draft) => {
      for (const message of draft.outbox) {
        if (
          message.channel === "inapp" &&
          message.customerEmail?.toLowerCase() === key &&
          message.status !== "read"
        ) {
          message.status = "read";
          message.readAt = at;
        }
      }
    });
  },

  /** Delivery stats for the admin notification dashboard. */
  stats() {
    const rows = getState().outbox;
    const byChannel = CHANNELS.map((channel) => {
      const subset = rows.filter((m) => m.channel === channel);
      const delivered = subset.filter(
        (m) => m.status === "delivered" || m.status === "read",
      ).length;
      return {
        channel,
        label: CHANNEL_LABELS[channel],
        sent: subset.length,
        delivered,
        failed: subset.filter((m) => m.status === "failed" || m.status === "bounced").length,
        rate: subset.length ? Math.round((delivered / subset.length) * 100) : 0,
      };
    });
    return {
      total: rows.length,
      delivered: rows.filter((m) => m.status === "delivered" || m.status === "read").length,
      failed: rows.filter((m) => m.status === "failed" || m.status === "bounced").length,
      byChannel,
    };
  },
};
