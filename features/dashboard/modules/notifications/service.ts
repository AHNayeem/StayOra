import type { AppNotification } from "./types";
import { NOTIFICATIONS_SEED } from "./data";

/**
 * Notification-centre data source (in-memory stub; repository-ready).
 *
 * Reads/writes a mutable working copy of the seed so mark-read / archive persist
 * for the session. Swapping to a real API means changing only these bodies — the
 * hooks and view stay untouched.
 */
let items: AppNotification[] = NOTIFICATIONS_SEED.map((n) => ({ ...n }));

const clone = () => items.map((n) => ({ ...n }));

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const notificationsService = {
  list: (): Promise<AppNotification[]> => delay(clone()),
  markRead: (id: string): Promise<AppNotification[]> => {
    items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
    return delay(clone());
  },
  markAllRead: (): Promise<AppNotification[]> => {
    items = items.map((n) => ({ ...n, read: true }));
    return delay(clone());
  },
  archive: (id: string): Promise<AppNotification[]> => {
    items = items.filter((n) => n.id !== id);
    return delay(clone());
  },
};

export const notificationKeys = {
  all: ["notifications"] as const,
};
