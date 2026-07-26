export const NOTIFICATION_TYPES = [
  "booking",
  "payment",
  "review",
  "merchant",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}
