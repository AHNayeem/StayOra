/**
 * Notification-centre types.
 *
 * The feed is now the platform's real event stream: the domain services raise a
 * notification whenever a booking, refund, settlement or offer changes state, so
 * this module's job is presentation only. `NotificationType` mirrors the domain's
 * categories.
 */

export type {
  NotificationAudience,
  NotificationCategory,
  PlatformNotification,
} from "../../domain/types";

import type { NotificationCategory, PlatformNotification } from "../../domain/types";

/** Category of a notification (kept as the module's public name). */
export type NotificationType = NotificationCategory;

/** The shape the notification centre renders. */
export type AppNotification = PlatformNotification;

export const NOTIFICATION_TYPES: NotificationCategory[] = [
  "booking",
  "payment",
  "refund",
  "offer",
  "settlement",
  "commission",
  "review",
  "support",
  "system",
];
