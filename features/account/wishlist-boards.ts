"use client";

import { useSyncExternalStore } from "react";
import type { Listing } from "@/types/catalog";
import { listingsByIds } from "@/features/discovery/catalog-index";
import { createCollectionStore } from "./collection-store";
import { useWishlistIds } from "./wishlist";

/**
 * Wishlist boards — organising what the heart button saves.
 *
 * The wishlist itself is unchanged: {@link "./wishlist"} still owns membership,
 * still one flat ordered list of ids, and every heart button in the app keeps
 * working exactly as before. Boards are a layer *on top* — a named group that
 * references those ids.
 *
 * That split is deliberate. Making the board the owner would mean the heart
 * button had to pick one, and un-hearting from a card would have to know which
 * board to remove from. Instead: saving always lands in the wishlist, and a
 * listing that isn't in any board shows under "Unsorted". A listing may sit in
 * more than one board (a place can be both "Honeymoon" and "Under $200"), which
 * a single `boardId` per listing could not express.
 */

export interface WishlistBoard {
  id: string;
  name: string;
  /** Optional one-liner — "Sea view, walkable, under $200". */
  note?: string;
  /** Listing ids in this board, in the order they were added. */
  listingIds: string[];
  createdAt: string;
}

const store = createCollectionStore<WishlistBoard>({
  key: "otithee:wishlist-boards",
  getId: (board) => board.id,
  seed: () => [],
});

const EVENT = "otithee:wishlist-boards:change";

function nextBoardId(): string {
  return `wlb_${Math.abs(Date.now() % 1_000_000).toString(36)}${store.get().length}`;
}

/** Reactive list of boards, oldest first (the order they were created in). */
export const useWishlistBoards = store.useAll;

export function createBoard(name: string, note?: string): WishlistBoard {
  const board: WishlistBoard = {
    id: nextBoardId(),
    name: name.trim() || "Untitled board",
    note: note?.trim() || undefined,
    listingIds: [],
    createdAt: new Date().toISOString(),
  };
  store.add(board, false);
  return board;
}

export function renameBoard(id: string, name: string, note?: string): void {
  store.update(id, { name: name.trim() || "Untitled board", note: note?.trim() || undefined });
}

/** Delete a board. The listings stay wishlisted — they fall back to Unsorted. */
export function deleteBoard(id: string): void {
  store.remove(id);
}

/** Put a listing in a board (idempotent). */
export function addToBoard(boardId: string, listingId: string): void {
  const board = store.get().find((b) => b.id === boardId);
  if (!board || board.listingIds.includes(listingId)) return;
  store.update(boardId, { listingIds: [...board.listingIds, listingId] });
}

export function removeFromBoard(boardId: string, listingId: string): void {
  const board = store.get().find((b) => b.id === boardId);
  if (!board) return;
  store.update(boardId, {
    listingIds: board.listingIds.filter((id) => id !== listingId),
  });
}

/** Toggle membership, returning whether the listing is now in the board. */
export function toggleInBoard(boardId: string, listingId: string): boolean {
  const board = store.get().find((b) => b.id === boardId);
  if (!board) return false;
  if (board.listingIds.includes(listingId)) {
    removeFromBoard(boardId, listingId);
    return false;
  }
  addToBoard(boardId, listingId);
  return true;
}

/** Board ids a listing belongs to (non-reactive; for event handlers). */
export function boardsContaining(listingId: string): string[] {
  return store
    .get()
    .filter((board) => board.listingIds.includes(listingId))
    .map((board) => board.id);
}

/** Reactive version of {@link boardsContaining}. */
export function useBoardsContaining(listingId: string): string[] {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => boardsContaining(listingId).join(","),
    () => "",
  )
    .split(",")
    .filter(Boolean);
}

/**
 * The wishlist grouped for display: every board with its resolved listings,
 * plus whatever is wishlisted but in no board at all.
 *
 * Board membership is intersected with the wishlist, so a listing removed from
 * the wishlist disappears from its boards without needing a cleanup pass — the
 * board is a view, and the wishlist is the source of truth. Re-hearting a
 * listing therefore restores it to the boards it was in, which is what someone
 * who un-hearted by accident expects.
 */
export function useWishlistGroups(): {
  boards: { board: WishlistBoard; listings: Listing[] }[];
  unsorted: Listing[];
} {
  const wishlisted = useWishlistIds();
  const boards = useWishlistBoards();
  const inWishlist = new Set(wishlisted);

  const grouped = boards.map((board) => ({
    board,
    listings: listingsByIds(board.listingIds.filter((id) => inWishlist.has(id))),
  }));

  const claimed = new Set(grouped.flatMap((g) => g.listings.map((l) => l.id)));
  return {
    boards: grouped,
    unsorted: listingsByIds(wishlisted.filter((id) => !claimed.has(id))),
  };
}
