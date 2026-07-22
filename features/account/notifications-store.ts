"use client";

import type { AccountNotification } from "@/types/traveler";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { createCollectionStore } from "./collection-store";

/**
 * Notifications store — the in-app notification feed with client-persisted
 * read-state, so marking one (or all) read sticks and the header/overview
 * badges update live. Seeded from the mock service.
 */
const store = createCollectionStore<AccountNotification>({
  key: "stayora:notifications",
  getId: (n) => n.id,
  seed: () => ACCOUNT_DATA.notifications,
});

export const useNotifications = store.useAll;

/** Reactive unread count (drives the badge). */
export function useUnreadCount(): number {
  return store.useAll().filter((n) => !n.read).length;
}

export function markRead(id: string): void {
  store.update(id, { read: true });
}

export function markAllRead(): void {
  store.replaceAll(store.get().map((n) => ({ ...n, read: true })));
}

export function removeNotification(id: string): void {
  store.remove(id);
}
