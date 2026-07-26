import type { StatusDef } from "../../lib/status";

export const SUBSCRIBER_STATUS_VALUES = ["subscribed", "unsubscribed", "bounced"] as const;
export type SubscriberStatus = (typeof SUBSCRIBER_STATUS_VALUES)[number];

export const SUBSCRIBER_SOURCE_VALUES = [
  "signup_form",
  "checkout",
  "import",
  "referral",
] as const;
export type SubscriberSource = (typeof SUBSCRIBER_SOURCE_VALUES)[number];

export interface Subscriber {
  id: string;
  email: string;
  name: string;
  status: SubscriberStatus;
  source: SubscriberSource;
  joinedAt: string;
}

export interface NewsletterSummary {
  subscribed: number;
  unsubscribed: number;
  bounced: number;
  /** Net new subscribers in the trailing 30 days. */
  newThisMonth: number;
}

export const SUBSCRIBER_STATUSES: readonly StatusDef<SubscriberStatus>[] = [
  { value: "subscribed", label: "Subscribed", tone: "success" },
  { value: "unsubscribed", label: "Unsubscribed", tone: "neutral" },
  { value: "bounced", label: "Bounced", tone: "danger" },
];

export const SUBSCRIBER_SOURCES: readonly StatusDef<SubscriberSource>[] = [
  { value: "signup_form", label: "Signup form", tone: "info" },
  { value: "checkout", label: "Checkout", tone: "success" },
  { value: "import", label: "Import", tone: "neutral" },
  { value: "referral", label: "Referral", tone: "warning" },
];
