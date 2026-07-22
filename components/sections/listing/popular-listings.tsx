import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { formatPrice } from "@/lib/utils";

/**
 * PopularListings — a compact "Most Popular" sidebar widget: small thumbnail
 * rows linking through to each listing's detail page. Presentational only, so it
 * renders fine inside the client listing template. Pass an already-ranked slice.
 */
export function PopularListings({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) return null;

  return (
    <aside className="rounded-card border border-line bg-surface p-6">
      <h2 className="text-h3">Most popular</h2>
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {listings.map((listing) => (
          <li key={listing.id} className="py-3 first:pt-0 last:pb-0">
            <Link
              href={`${VERTICALS[listing.vertical].href}/${listing.slug}`}
              className="group flex items-center gap-3"
            >
              <span className="relative size-16 shrink-0 overflow-hidden rounded-field">
                <Image
                  src={listing.image}
                  alt={listing.title}
                  fill
                  sizes="64px"
                  className="object-cover transition-transform duration-slow group-hover:scale-105"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold text-ink transition-colors group-hover:text-primary">
                  {listing.title}
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                  {listing.rating !== undefined && (
                    <span className="inline-flex items-center gap-0.5 text-ink">
                      <Star
                        className="size-3.5 fill-accent text-accent"
                        aria-hidden="true"
                      />
                      {listing.rating.toFixed(1)}
                    </span>
                  )}
                  <span className="font-semibold text-primary">
                    {formatPrice(listing.price.amount)}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
