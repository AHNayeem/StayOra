"use client";

import { useMutation, useQuery } from "../../data";
import type { Paginated } from "../../data";
import { useDomainScope, useNotificationAudience } from "../../domain/use-domain";
import { notificationKeys, notificationsService } from "./service";
import type { AppNotification } from "./types";

/** The notification feed for the signed-in principal's audience + scope. */
export function useNotifications() {
  const audience = useNotificationAudience();
  const scope = useDomainScope();
  return useQuery<Paginated<AppNotification>>({
    queryKey: [...notificationKeys.all, audience, scope.merchantId ?? "all"],
    queryFn: () => notificationsService.list({ page: 1, pageSize: 50 }, audience, scope),
  });
}

/** Unread count — drives the top-nav bell badge. */
export function useUnreadNotificationCount() {
  const audience = useNotificationAudience();
  const scope = useDomainScope();
  return useQuery<number>({
    queryKey: [...notificationKeys.unread(), audience, scope.merchantId ?? "all"],
    queryFn: () => notificationsService.unreadCount(audience, scope),
    staleTime: 5_000,
  });
}

/** Mark a single notification read. */
export function useMarkNotificationRead() {
  return useMutation<AppNotification, string>({
    mutationFn: (id) => notificationsService.markRead(id),
    invalidateKeys: [[...notificationKeys.all]],
  });
}

/** Mark every notification in this audience read. */
export function useMarkAllNotificationsRead() {
  const audience = useNotificationAudience();
  return useMutation<number, void>({
    mutationFn: () => notificationsService.markAllRead(audience),
    invalidateKeys: [[...notificationKeys.all]],
  });
}
