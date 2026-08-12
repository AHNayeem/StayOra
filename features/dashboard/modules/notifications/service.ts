/**
 * Notification-centre data source — the domain notification service.
 *
 * Nothing is seeded locally any more: entries are produced by the same domain
 * calls that change business state, which is why confirming a booking or approving
 * a refund shows up here immediately (and only for the audiences it concerns).
 */

export { notificationService as notificationsService } from "../../domain/services";

export const notificationKeys = {
  all: ["notifications"] as const,
  unread: () => ["notifications", "unread"] as const,
};
