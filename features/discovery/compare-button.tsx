"use client";

import { Scale } from "lucide-react";
import { COMPARE_LIMIT, toggleCompare, useIsComparing } from "./compare-store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface CompareButtonProps {
  listingId: string;
  /** Accessible label describing what is being compared — the listing title. */
  label: string;
  className?: string;
}

/**
 * CompareButton — the tray toggle overlaid on card media, beside the wishlist
 * heart. A client island inside an otherwise server-rendered card, mirroring
 * {@link "@/components/cards/wishlist-button".WishlistButton} so the two read as
 * one control group.
 */
export function CompareButton({ listingId, label, className }: CompareButtonProps) {
  const comparing = useIsComparing(listingId);

  const toggle = (e: React.MouseEvent) => {
    // The card media sits under a stretched link — don't navigate on toggle.
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompare(listingId);
    if (result === "full") {
      toast.info(`Compare holds ${COMPARE_LIMIT} stays`, {
        description: "Remove one from the compare tray to add another.",
      });
      return;
    }
    toast[result === "added" ? "success" : "info"](
      result === "added" ? "Added to compare" : "Removed from compare",
      { description: label },
    );
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={comparing}
      aria-label={comparing ? `Remove ${label} from compare` : `Add ${label} to compare`}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-card backdrop-blur transition hover:bg-surface hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        comparing && "bg-primary text-white hover:bg-primary hover:text-white",
        className,
      )}
    >
      <Scale className="size-4.5" aria-hidden="true" />
    </button>
  );
}
