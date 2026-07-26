import type { StatusDef } from "../../lib/status";

export const TEMPLATE_CHANNEL_VALUES = ["email", "sms", "push"] as const;
export type TemplateChannel = (typeof TEMPLATE_CHANNEL_VALUES)[number];

/**
 * A notification template — one message the platform sends on an event, in a
 * single channel. `subject` is only meaningful for email; SMS/push leave it
 * blank. `key` is the stable event slug a backend triggers on.
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  key: string;
  channel: TemplateChannel;
  subject: string;
  body: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
}

export const TEMPLATE_CHANNELS: readonly StatusDef<TemplateChannel>[] = [
  { value: "email", label: "Email", tone: "info" },
  { value: "sms", label: "SMS", tone: "warning" },
  { value: "push", label: "Push", tone: "success" },
];

/** Icon name (dashboard registry) per channel. */
export const CHANNEL_ICON: Record<TemplateChannel, string> = {
  email: "Mail",
  sms: "MessageSquare",
  push: "BellRing",
};
