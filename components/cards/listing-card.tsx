import { MapPin } from "lucide-react";
import type { BookableBase } from "@/types/booking";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardFooter,
  CardMedia,
  CardMetaList,
  CardTitle,
  type CardMetaItem,
} from "@/components/ui/card";
import { PriceTag } from "@/components/ui/price-tag";
import { RatingStars } from "@/components/ui/rating-stars";
import { WishlistButton } from "./wishlist-button";

export interface ListingCardProps {
  /** Any bookable entity — the shared display fields are read from here. */
  listing: BookableBase;
  /** Detail-page route. */
  href: string;
  /** Vertical-specific meta row (beds, duration, seats…). */
  meta?: CardMetaItem[];
  /** Extra badge shown before the entity's own badges (e.g. star class). */
  leadBadge?: string;
  /** Prefix the price with "From". */
  priceFrom?: boolean;
  /** Show the wishlist heart. Default true. */
  wishlist?: boolean;
  /** next/image `sizes` for this grid context. */
  imageSizes?: string;
  className?: string;
}

/**
 * ListingCard — the unified card for every bookable vertical. Per-vertical cards
 * (HotelCard, TourCard…) are thin wrappers that pass a typed entity plus their
 * own `meta` row; all shared chrome (media, badges, wishlist, rating, price,
 * link) lives here so the look stays consistent across the platform.
 */
export function ListingCard({
  listing,
  href,
  meta,
  leadBadge,
  priceFrom,
  wishlist = true,
  imageSizes,
  className,
}: ListingCardProps) {
  const { title, image, location, price, rating, reviewCount, badges, featured } = listing;

  return (
    <Card className={className}>
      <CardMedia
        src={image}
        alt={title}
        sizes={imageSizes}
        badges={
          (featured || leadBadge || badges?.length) && (
            <>
              {featured && <Badge variant="accent">Featured</Badge>}
              {leadBadge && <Badge variant="dark">{leadBadge}</Badge>}
              {badges?.map((b) => (
                <Badge key={b} variant="primary">
                  {b}
                </Badge>
              ))}
            </>
          )
        }
        actions={wishlist ? <WishlistButton label={title} listingId={listing.id} /> : undefined}
      />

      <CardBody>
        <div className="flex items-start justify-between gap-2">
          <p className="inline-flex items-center gap-1 text-sm text-muted">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{location.label}</span>
          </p>
          {rating !== undefined && (
            <RatingStars value={rating} size="sm" showValue reviewCount={reviewCount} />
          )}
        </div>

        <CardTitle href={href}>{title}</CardTitle>

        {meta && meta.length > 0 && <CardMetaList items={meta} className="mt-1" />}
      </CardBody>

      <CardFooter>
        <PriceTag price={price} size="md" from={priceFrom} showDiscount />
      </CardFooter>
    </Card>
  );
}
