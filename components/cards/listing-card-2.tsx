import type { BookableBase } from "@/types/booking";
import { Badge } from "@/components/ui/badge";
import { Card, CardMedia, CardTitle } from "@/components/ui/card";
import { PriceTag } from "@/components/ui/price-tag";
import { cn } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

export interface ListingCard2Props {
  /** Any bookable entity — the shared display fields are read from here. */
  listing: BookableBase;
  /** Detail-page route. */
  href: string;
  /** Label before the price. Default "Starting from:". */
  priceLabel?: string;
  /** Show the entity's badges (Featured + own badges). Default false — the
   *  overlay layout reads cleanest with a clean image. */
  badges?: boolean;
  /** Show the wishlist heart. Default false (same reason as `badges`). */
  wishlist?: boolean;
  /** Media aspect ratio. Default "wide" (16/10), as in the reference design. */
  aspect?: "card" | "wide" | "video" | "square" | "portrait";
  /** next/image `sizes` for this grid context. */
  imageSizes?: string;
  className?: string;
}

/**
 * ListingCard2 — an overlay variant of {@link ListingCard}: the image is inset
 * inside a tinted frame, and the title, starting price and full address sit on
 * top of it over a bottom-up scrim. No footer, no rating row — use it where the
 * image should carry the card (hero grids, featured strips) and {@link
 * ListingCard} where the meta/price footer matters.
 */
export function ListingCard2({
  listing,
  href,
  priceLabel = "Starting from:",
  badges = false,
  wishlist = false,
  aspect = "wide",
  imageSizes,
  className,
}: ListingCard2Props) {
  const { title, image, location, price, featured } = listing;

  // The reference design shows the full address: street line, then area, then
  // country — whichever of those the entity actually carries.
  const address = [location.label, location.city, location.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      className={cn(
        "rounded-[14px] border-transparent bg-primary-50/70 p-2 shadow-card",
        className,
      )}
    >
      <div className="relative overflow-hidden rounded-card">
        <CardMedia
          src={image}
          alt={title}
          href={href}
          aspect={aspect}
          sizes={imageSizes}
          badges={
            badges && (featured || listing.badges?.length) ? (
              <>
                {featured && <Badge variant="accent">Featured</Badge>}
                {listing.badges?.map((b) => (
                  <Badge key={b} variant="primary">
                    {b}
                  </Badge>
                ))}
              </>
            ) : undefined
          }
          actions={wishlist ? <WishlistButton label={title} listingId={listing.id} /> : undefined}
        />

        {/* Caption stack over a scrim. `pointer-events-none` lets clicks fall
            through to the media's stretched link; the title link opts back in
            so it stays keyboard-focusable. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 bg-linear-to-t from-ink/90 via-ink/60 to-transparent px-4 pt-16 pb-4 text-white">
          <CardTitle
            href={href}
            className="pointer-events-auto line-clamp-1 text-xl font-semibold tracking-wide text-white uppercase hover:text-white/90"
          >
            {title}
          </CardTitle>

          <p className="flex flex-wrap items-baseline gap-x-2 text-base">
            <span>{priceLabel}</span>
            <PriceTag price={price} size="md" className="[&_*]:!text-white" />
          </p>

          {address && <p className="line-clamp-2 text-sm text-white/90">{address}</p>}
        </div>
      </div>
    </Card>
  );
}
