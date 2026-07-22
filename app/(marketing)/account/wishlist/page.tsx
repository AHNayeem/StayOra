"use client";

import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { clearWishlist, useWishlistListings } from "@/features/account/wishlist";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { AutoListingCard } from "@/components/cards/auto-listing-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/**
 * Wishlist — the traveler's saved listings. Reads the persisted wishlist store
 * directly (client), so removing an item updates the grid, header count and
 * sidebar badge instantly.
 */
export default function WishlistPage() {
  const listings = useWishlistListings();

  const onClear = () => {
    clearWishlist();
    toast.info("Wishlist cleared");
  };

  return (
    <div>
      <AccountPageHeader
        title="Wishlist"
        description={
          listings.length > 0
            ? `${listings.length} saved ${listings.length === 1 ? "place" : "places"} to come back to.`
            : "Save places you love while you browse."
        }
        actions={
          listings.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={onClear} className="text-danger hover:bg-danger/10">
              <Trash2 className="size-4" aria-hidden="true" />
              Clear all
            </Button>
          ) : undefined
        }
      />

      {listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <AutoListingCard key={listing.id} listing={listing} className="h-full" />
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
