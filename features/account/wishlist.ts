"use client";

import { useSyncExternalStore } from "react";
import type { Listing } from "@/types/catalog";
import {
  ACTIVITIES,
  APARTMENTS,
  CONVENTION_HALLS,
  HOTELS,
  RESORTS,
  SHARED_ROOMS,
  TOURS,
  TRANSPORT,
  VISAS,
} from "@/constants/listings";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { createCollectionStore } from "./collection-store";

/**
 * Wishlist store — the traveler's saved listings, held as an ordered list of
 * listing ids and persisted client-side. The heart button on any card reads
 * and toggles it live; the wishlist page resolves the ids back to full
 * {@link Listing} objects via a module-level index.
 */

/** id → Listing lookup, built once from the catalog constants (client bundle). */
const LISTING_INDEX: Map<string, Listing> = new Map(
  [
    ...HOTELS,
    ...APARTMENTS,
    ...RESORTS,
    ...SHARED_ROOMS,
    ...CONVENTION_HALLS,
    ...TRANSPORT,
    ...TOURS,
    ...ACTIVITIES,
    ...VISAS,
  ].map((l) => [l.id, l]),
);

const store = createCollectionStore<string>({
  key: "stayora:wishlist",
  getId: (id) => id,
  seed: () => ACCOUNT_DATA.wishlistSeedIds,
});

/** Reactive list of wishlisted listing ids. */
export const useWishlistIds = store.useAll;
/** Reactive wishlist size. */
export const useWishlistCount = store.useCount;

/** Toggle a listing in/out of the wishlist. Returns the new membership. */
export function toggleWishlist(id: string): boolean {
  if (store.has(id)) {
    store.remove(id);
    return false;
  }
  store.add(id);
  return true;
}

export function removeFromWishlist(id: string): void {
  store.remove(id);
}

export function clearWishlist(): void {
  store.replaceAll([]);
}

/** Reactive membership check for a single listing (drives the heart button). */
export function useIsWishlisted(id: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const evt = "stayora:wishlist:change";
      window.addEventListener(evt, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(evt, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => store.has(id),
    () => ACCOUNT_DATA.wishlistSeedIds.includes(id),
  );
}

/** Reactive, resolved wishlist listings in saved order (unknown ids dropped). */
export function useWishlistListings(): Listing[] {
  const ids = useWishlistIds();
  return ids.map((id) => LISTING_INDEX.get(id)).filter((l): l is Listing => Boolean(l));
}
