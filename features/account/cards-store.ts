"use client";

import type { SavedCard } from "@/types/traveler";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { createCollectionStore } from "./collection-store";

/**
 * Saved-cards store — the traveler's stored payment methods, persisted
 * client-side. Adding, deleting and setting a default all survive reload.
 */
const store = createCollectionStore<SavedCard>({
  key: "stayora:saved-cards",
  getId: (c) => c.id,
  seed: () => ACCOUNT_DATA.savedCards,
});

export const useSavedCards = store.useAll;

export function addCard(card: SavedCard): void {
  // A newly-added default demotes the others.
  if (card.isDefault) {
    store.replaceAll([
      card,
      ...store.get().map((c) => ({ ...c, isDefault: false })),
    ]);
    return;
  }
  store.add(card, false);
}

export function removeCard(id: string): void {
  const remaining = store.get().filter((c) => c.id !== id);
  // Ensure one card stays default.
  if (remaining.length > 0 && !remaining.some((c) => c.isDefault)) {
    remaining[0] = { ...remaining[0], isDefault: true };
  }
  store.replaceAll(remaining);
}

export function setDefaultCard(id: string): void {
  store.replaceAll(store.get().map((c) => ({ ...c, isDefault: c.id === id })));
}
