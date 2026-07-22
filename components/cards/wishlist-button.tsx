"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist, useIsWishlisted } from "@/features/account/wishlist";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  /** Accessible label describing what is being saved, e.g. the listing title. */
  label: string;
  /** Listing id — when given, the button reads/writes the persisted wishlist. */
  listingId?: string;
  /** Controlled saved state (ignored when `listingId` is set). */
  saved?: boolean;
  defaultSaved?: boolean;
  onToggle?: (saved: boolean) => void;
  className?: string;
}

/**
 * WishlistButton — the small heart toggle overlaid on card media. The only
 * client island in the card system; the surrounding card stays a server
 * component. When a `listingId` is passed it drives the shared, persisted
 * wishlist store so its state stays in sync everywhere the listing appears and
 * on the account wishlist page. Falls back to controlled/uncontrolled local
 * state when no id is given.
 */
export function WishlistButton({
  label,
  listingId,
  saved,
  defaultSaved = false,
  onToggle,
  className,
}: WishlistButtonProps) {
  const [internal, setInternal] = useState(defaultSaved);
  const storeSaved = useIsWishlisted(listingId ?? "");
  const isSaved = listingId ? storeSaved : (saved ?? internal);

  const toggle = (e: React.MouseEvent) => {
    // Card media is wrapped in a stretched link — don't navigate on toggle.
    e.preventDefault();
    e.stopPropagation();
    if (listingId) {
      const next = toggleWishlist(listingId);
      toast[next ? "success" : "info"](
        next ? "Saved to wishlist" : "Removed from wishlist",
        { description: label },
      );
      onToggle?.(next);
      return;
    }
    const next = !isSaved;
    if (saved === undefined) setInternal(next);
    onToggle?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${label} from wishlist` : `Add ${label} to wishlist`}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-card backdrop-blur transition hover:bg-surface hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <Heart
        className={cn("size-4.5 transition", isSaved && "fill-danger text-danger")}
        aria-hidden="true"
      />
    </button>
  );
}
