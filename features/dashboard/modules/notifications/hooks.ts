"use client";

import { useMutation, useQuery } from "../../data";
import { notificationKeys, notificationsService } from "./service";
import type { AppNotification } from "./types";

/** The notification-centre feed (newest first, as seeded). */
export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.list(),
  });
}

/** Mark a single notification read. */
export function useMarkNotificationRead() {
  return useMutation<AppNotification[], string>({
    mutationFn: (id) => notificationsService.markRead(id),
    invalidateKeys: [notificationKeys.all],
  });
}

/** Mark every notification read. */
export function useMarkAllNotificationsRead() {
  return useMutation<AppNotification[]>({
    mutationFn: () => notificationsService.markAllRead(),
    invalidateKeys: [notificationKeys.all],
  });
}

/** Dismiss (archive) a notification. */
export function useArchiveNotification() {
  return useMutation<AppNotification[], string>({
    mutationFn: (id) => notificationsService.archive(id),
    invalidateKeys: [notificationKeys.all],
  });
}
