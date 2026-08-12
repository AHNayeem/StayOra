"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { AIBlock, AIListingRef } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { WishlistButton } from "@/components/cards/wishlist-button";
import { VERTICALS } from "@/constants/verticals";
import { cn } from "@/lib/utils";
import { AiText } from "./ai-text";
import { BlockShell } from "./block-shell";

type ListingsBlock = Extract<AIBlock, { kind: "listings" }>;

/**
 * ListingBlock — the assistant's stay/tour/activity results.
 *
 * Deliberately a compact row rather than a copy of {@link "@/components/cards"}:
 * a chat column is ~360px wide and the site's cards are built for a 3-up grid.
 * Everything else is shared — the same wishlist store, the same price
 * formatting, the same detail links — so a result here and a card on the site
 * always agree.
 */
export function ListingBlock({
  block,
  onCompare,
  onAsk,
}: {
  block: ListingsBlock;
  onCompare?: () => void;
  onAsk?: (prompt: string) => void;
}) {
  return (
    <BlockShell
      title={block.title}
      note={block.note}
      moreHref={block.moreHref}
      action={
        block.comparable && onCompare ? (
          <button
            type="button"
            onClick={onCompare}
            className="rounded-pill border border-line px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Compare these
          </button>
        ) : null
      }
    >
      <ul className="divide-y divide-line">
        {block.items.map((item) => (
          <ListingRow key={item.listing.id} item={item} onAsk={onAsk} />
        ))}
      </ul>
    </BlockShell>
  );
}

function ListingRow({
  item,
  onAsk,
}: {
  item: AIListingRef;
  onAsk?: (prompt: string) => void;
}) {
  const { money } = useLocale();
  const { listing } = item;
  const config = VERTICALS[listing.vertical];

  return (
    <li className="flex gap-3 p-3">
      <Link
        href={item.href}
        className="relative size-20 shrink-0 overflow-hidden rounded-field bg-surface-muted"
      >
        <Image
          src={listing.image}
          alt={listing.title}
          fill
          sizes="80px"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={item.href}
            className="line-clamp-2 text-sm font-semibold text-ink transition-colors hover:text-primary"
          >
            {listing.title}
          </Link>
          <WishlistButton
            label={listing.title}
            listingId={listing.id}
            className="size-8 shrink-0 shadow-none"
          />
        </div>

        <p className="inline-flex items-center gap-1 truncate text-xs text-muted">
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          {listing.location.label}
        </p>

        {item.reason && (
          <p className="line-clamp-2 text-xs text-body">
            <AiText text={item.reason} />
          </p>
        )}

        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-accent-600">
            {money(listing.price.amount)}
            <span className="ml-1 text-xs font-normal text-muted">{config.priceUnit}</span>
          </span>
          {item.totalUsd !== undefined && (
            <span className="text-xs text-body">
              {money(item.totalUsd)} total · {item.nights} nights
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {listing.rating !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink">
              <Star className="size-3 fill-rating text-rating" aria-hidden="true" />
              {listing.rating.toFixed(1)}
            </span>
          )}
          <Link
            href={item.href}
            className="rounded-pill bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
          >
            View
          </Link>
          {onAsk && (
            <button
              type="button"
              onClick={() => onAsk(`Book ${listing.title}`)}
              className={cn(
                "rounded-pill border border-line px-3 py-1 text-xs font-semibold text-ink",
                "transition-colors hover:border-primary hover:text-primary",
              )}
            >
              Book this
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
