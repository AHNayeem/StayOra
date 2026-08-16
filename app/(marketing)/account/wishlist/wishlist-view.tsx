"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus, Heart, Pencil, Trash2 } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { clearWishlist, useWishlistCount } from "@/features/account/wishlist";
import {
  createBoard,
  deleteBoard,
  removeFromBoard,
  renameBoard,
  toggleInBoard,
  useBoardsContaining,
  useWishlistBoards,
  useWishlistGroups,
  type WishlistBoard,
} from "@/features/account/wishlist-boards";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { AutoListingCard } from "@/components/cards/auto-listing-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

/**
 * Wishlist — saved listings, grouped into boards.
 *
 * The heart button still saves to one flat wishlist; boards are the organising
 * layer over it (`features/account/wishlist-boards`). Anything not filed sits
 * under "Unsorted", so no save can go missing behind an empty board.
 */
export function WishlistView() {
  const count = useWishlistCount();
  const boards = useWishlistBoards();
  const { boards: grouped, unsorted } = useWishlistGroups();
  const [editing, setEditing] = useState<WishlistBoard | "new" | null>(null);
  const [filing, setFiling] = useState<Listing | null>(null);

  if (count === 0) {
    return (
      <div>
        <AccountPageHeader
          title="Wishlist"
          description="Save places you love while you browse."
        />
        <AccountEmpty
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart on any stay, tour or experience to save it here for later."
          action={
            <Link href="/" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Start exploring
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="Wishlist"
        description={`${count} saved ${count === 1 ? "place" : "places"}${
          boards.length ? ` across ${boards.length} board${boards.length === 1 ? "" : "s"}` : ""
        }.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FolderPlus className="size-4" />}
              onClick={() => setEditing("new")}
            >
              New board
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearWishlist();
                toast.info("Wishlist cleared", {
                  description: "Your boards are still there, ready for the next save.",
                });
              }}
              className="text-danger hover:bg-danger/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Clear all
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-10">
        {grouped.map(({ board, listings }) => (
          <section key={board.id}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-ink">{board.name}</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {listings.length} {listings.length === 1 ? "place" : "places"}
                  {board.note ? ` · ${board.note}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Rename ${board.name}`}
                  onClick={() => setEditing(board)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${board.name}`}
                  className="text-danger hover:bg-danger/10"
                  onClick={() => {
                    deleteBoard(board.id);
                    toast.info(`“${board.name}” deleted`, {
                      description: "Its places moved back to Unsorted.",
                    });
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {listings.length === 0 ? (
              <p className="rounded-panel border border-dashed border-line py-8 text-center text-sm text-muted">
                Nothing filed here yet. Use “Add to board” on any saved place below.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => (
                  <div key={listing.id} className="flex flex-col gap-2">
                    <AutoListingCard listing={listing} className="h-full" />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => setFiling(listing)}
                      >
                        Move
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          removeFromBoard(board.id, listing.id);
                          toast.info(`Removed from “${board.name}”`, {
                            description: "It's still in your wishlist, under Unsorted.",
                          });
                        }}
                      >
                        Remove from board
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {unsorted.length > 0 && (
          <section>
            <div className="mb-4 border-b border-line pb-3">
              <h2 className="text-lg font-semibold text-ink">
                {grouped.length > 0 ? "Unsorted" : "Saved places"}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {unsorted.length} {unsorted.length === 1 ? "place" : "places"} not in a board
                {grouped.length === 0 ? " — make one to group them by trip or idea." : ""}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {unsorted.map((listing) => (
                <div key={listing.id} className="flex flex-col gap-2">
                  <AutoListingCard listing={listing} className="h-full" />
                  <Button variant="ghost" size="sm" onClick={() => setFiling(listing)}>
                    Add to board
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <BoardEditor
        board={editing}
        onClose={() => setEditing(null)}
      />
      <FileToBoards
        listing={filing}
        boards={boards}
        onClose={() => setFiling(null)}
        onCreateBoard={() => {
          setFiling(null);
          setEditing("new");
        }}
      />
    </div>
  );
}

/** Create or rename a board. */
function BoardEditor({
  board,
  onClose,
}: {
  board: WishlistBoard | "new" | null;
  onClose: () => void;
}) {
  const isNew = board === "new";
  const existing = board && board !== "new" ? board : null;
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  // Seed the fields the first render the modal is open for a given board.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const key = isNew ? "new" : (existing?.id ?? null);
  if (key && seededFor !== key) {
    setSeededFor(key);
    setName(existing?.name ?? "");
    setNote(existing?.note ?? "");
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Give the board a name");
      return;
    }
    if (existing) {
      renameBoard(existing.id, name, note);
      toast.success("Board updated");
    } else {
      createBoard(name, note);
      toast.success(`“${name.trim()}” created`);
    }
    onClose();
  }

  return (
    <Modal
      open={Boolean(board)}
      onClose={onClose}
      title={existing ? "Rename board" : "New board"}
      description="Group saved places by trip, budget or whatever helps you decide."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            {existing ? "Save changes" : "Create board"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Board name"
          required
          placeholder="Honeymoon shortlist"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Textarea
          label="Note"
          rows={2}
          placeholder="Sea view, walkable, under $200"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/** Tick the boards a listing belongs to. A place can be in more than one. */
function FileToBoards({
  listing,
  boards,
  onClose,
  onCreateBoard,
}: {
  listing: Listing | null;
  boards: WishlistBoard[];
  onClose: () => void;
  onCreateBoard: () => void;
}) {
  return (
    <Modal
      open={Boolean(listing)}
      onClose={onClose}
      title="Add to board"
      description={listing?.title}
      footer={
        <div className="flex justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onCreateBoard}>
            <FolderPlus className="size-4" aria-hidden="true" />
            New board
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {listing &&
        (boards.length === 0 ? (
          <p className="text-sm text-muted">
            You don&apos;t have any boards yet. Create one to start grouping saved places.
          </p>
        ) : (
          <BoardCheckList listingId={listing.id} boards={boards} />
        ))}
    </Modal>
  );
}

function BoardCheckList({ listingId, boards }: { listingId: string; boards: WishlistBoard[] }) {
  const member = new Set(useBoardsContaining(listingId));
  return (
    <div className="flex flex-col gap-2">
      {boards.map((board) => (
        <Checkbox
          key={board.id}
          label={board.name}
          hint={board.note}
          checked={member.has(board.id)}
          onChange={() => {
            const added = toggleInBoard(board.id, listingId);
            toast.info(added ? `Added to “${board.name}”` : `Removed from “${board.name}”`);
          }}
        />
      ))}
    </div>
  );
}
