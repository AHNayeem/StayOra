"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Minus, Star, X } from "lucide-react";
import type { Listing } from "@/types/catalog";
import {
  cheapestQuote,
  getRoomTypes,
  isPerNight,
  ratePlansFor,
  type StayQuote,
} from "@/features/dashboard/domain";
import { toPropertyRef, useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { Modal } from "@/components/ui/modal";
import { VERTICALS } from "@/constants/verticals";
import { toISODate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { removeFromCompare } from "./compare-store";

/**
 * The comparison table.
 *
 * Every column is derived from data that already exists — the catalogue entity
 * for price/rating/amenities, and the live inventory engine for room types,
 * rate plans, cancellation terms and availability. Nothing is stored: change a
 * rate in the revenue manager and the comparison changes with it.
 */

/** The amenity-ish strings a vertical exposes, however it names them. */
function amenitiesOf(listing: Listing): string[] {
  if ("amenities" in listing && Array.isArray(listing.amenities)) {
    return listing.amenities;
  }
  return listing.badges ?? [];
}

interface CompareRow {
  listing: Listing;
  quote: StayQuote | null;
  roomCount: number;
  roomNames: string[];
  planNames: string[];
  amenities: string[];
}

function buildRow(listing: Listing, checkIn: string, checkOut: string): CompareRow {
  const property = toPropertyRef(listing);
  const rooms = getRoomTypes(property);
  return {
    listing,
    quote: cheapestQuote(property, checkIn, isPerNight(listing.vertical) ? checkOut : checkIn),
    roomCount: rooms.length,
    roomNames: rooms.map((r) => r.name),
    planNames: ratePlansFor(listing.vertical).map((p) => p.name),
    amenities: amenitiesOf(listing),
  };
}

/** A stay window a fortnight out — enough lead time that rates are open. */
function defaultWindow(): { checkIn: string; checkOut: string } {
  const start = new Date(Date.now() + 14 * 86_400_000);
  return {
    checkIn: toISODate(start),
    checkOut: toISODate(new Date(start.getTime() + 2 * 86_400_000)),
  };
}

interface CompareDialogProps {
  open: boolean;
  onClose: () => void;
  listings: Listing[];
}

export function CompareDialog({ open, onClose, listings }: CompareDialogProps) {
  // Computed on mount, which only ever happens client-side (the dialog is not
  // rendered until the traveller opens it), so no SSR/CSR date mismatch.
  const [window_, setWindow] = useState(defaultWindow);

  const rows = useDomainValue(
    () => listings.map((l) => buildRow(l, window_.checkIn, window_.checkOut)),
    [listings.map((l) => l.id).join(","), window_.checkIn, window_.checkOut],
  );

  // The union of every amenity on show, so each column can tick or cross it.
  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) for (const a of row.amenities) set.add(a);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const bestPrice = useMemo(
    () => Math.min(...listings.map((l) => l.price.amount)),
    [listings],
  );
  const bestRating = useMemo(
    () => Math.max(...listings.map((l) => l.rating ?? 0)),
    [listings],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compare stays"
      description={`${listings.length} side by side — prices and availability for the dates below.`}
      size="xl"
      className="max-w-6xl"
    >
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Check in</span>
          <input
            type="date"
            value={window_.checkIn}
            onChange={(e) => setWindow((w) => ({ ...w, checkIn: e.target.value }))}
            className="h-10 rounded-field border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink">Check out</span>
          <input
            type="date"
            value={window_.checkOut}
            min={window_.checkIn}
            onChange={(e) => setWindow((w) => ({ ...w, checkOut: e.target.value }))}
            className="h-10 rounded-field border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <caption className="sr-only">
            Comparison of {listings.length} listings by price, rating, rooms, rates,
            cancellation policy and availability
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-40 p-2 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-muted">
                <span className="sr-only">Attribute</span>
              </th>
              {rows.map((row) => (
                <th key={row.listing.id} scope="col" className="w-56 p-2 align-bottom">
                  <CompareHeader row={row} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="align-top">
            <CompareSection label="Price">
              {rows.map((row) => (
                <Cell key={row.listing.id}>
                  <PriceCell row={row} best={row.listing.price.amount === bestPrice} />
                </Cell>
              ))}
            </CompareSection>

            <CompareSection label="Rating">
              {rows.map((row) => (
                <Cell key={row.listing.id}>
                  {row.listing.rating !== undefined ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-medium",
                        row.listing.rating === bestRating && bestRating > 0 && "text-primary",
                      )}
                    >
                      <Star className="size-4 fill-current" aria-hidden="true" />
                      {row.listing.rating.toFixed(1)}
                      <span className="font-normal text-muted">
                        ({row.listing.reviewCount ?? 0})
                      </span>
                    </span>
                  ) : (
                    <Absent />
                  )}
                </Cell>
              ))}
            </CompareSection>

            <CompareSection label="Availability">
              {rows.map((row) => (
                <Cell key={row.listing.id}>
                  <AvailabilityCell quote={row.quote} />
                </Cell>
              ))}
            </CompareSection>

            <CompareSection label="Room options">
              {rows.map((row) => (
                <Cell key={row.listing.id}>
                  <p className="font-medium text-ink">
                    {row.roomCount} {row.roomCount === 1 ? "room type" : "room types"}
                  </p>
                  <p className="mt-1 text-muted">{row.roomNames.join(" · ")}</p>
                </Cell>
              ))}
            </CompareSection>

            <CompareSection label="Rate plans">
              {rows.map((row) => (
                <Cell key={row.listing.id}>
                  <ul className="space-y-0.5 text-muted">
                    {row.planNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </Cell>
              ))}
            </CompareSection>

            <CompareSection label="Cancellation">
              {rows.map((row) => (
                <Cell key={row.listing.id}>
                  {row.quote ? (
                    <span className={row.quote.refundable ? "text-success" : "text-body"}>
                      {row.quote.cancellationSummary}
                    </span>
                  ) : (
                    <span className="text-muted">Depends on the rate chosen</span>
                  )}
                </Cell>
              ))}
            </CompareSection>

            {allAmenities.length > 0 && (
              <>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={rows.length + 1}
                    className="border-t border-line pb-1 pt-4 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    Amenities
                  </th>
                </tr>
                {allAmenities.map((amenity) => (
                  <tr key={amenity} className="border-t border-line/60">
                    <th scope="row" className="p-2 text-left font-medium text-body">
                      {amenity}
                    </th>
                    {rows.map((row) => (
                      <td key={row.listing.id} className="p-2">
                        {row.amenities.includes(amenity) ? (
                          <>
                            <Check className="size-4 text-success" aria-hidden="true" />
                            <span className="sr-only">Included</span>
                          </>
                        ) : (
                          <Absent />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function CompareSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr className="border-t border-line">
      <th scope="row" className="p-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="p-2 text-body">{children}</td>;
}

function Absent() {
  return (
    <>
      <Minus className="size-4 text-muted/60" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </>
  );
}

function CompareHeader({ row }: { row: CompareRow }) {
  const { listing } = row;
  const href = `${VERTICALS[listing.vertical].href}/${listing.slug}`;
  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="relative h-24 w-full overflow-hidden rounded-card">
        <Image
          src={listing.image}
          alt=""
          fill
          sizes="224px"
          className="object-cover"
        />
        <button
          type="button"
          onClick={() => removeFromCompare(listing.id)}
          aria-label={`Remove ${listing.title} from comparison`}
          className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-ink shadow-card transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <Link
        href={href}
        className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary"
      >
        {listing.title}
      </Link>
      <p className="text-xs font-normal text-muted">{listing.location.label}</p>
    </div>
  );
}

function PriceCell({ row, best }: { row: CompareRow; best: boolean }) {
  const { money } = useLocale();
  const nightly = row.quote?.averageNightly ?? row.listing.price.amount;
  return (
    <div>
      <p className={cn("font-semibold text-ink", best && "text-primary")}>
        {money(nightly)}
        <span className="ml-1 text-xs font-normal text-muted">
          {row.listing.price.unit ?? "per night"}
        </span>
      </p>
      {row.quote && (
        <p className="mt-0.5 text-xs text-muted">
          {money(row.quote.roomSubtotal)} total · {row.quote.roomTypeName}
        </p>
      )}
      {best && <p className="mt-0.5 text-xs font-medium text-primary">Lowest price</p>}
    </div>
  );
}

function AvailabilityCell({ quote }: { quote: StayQuote | null }) {
  if (!quote) {
    return <span className="font-medium text-danger">No availability on these dates</span>;
  }
  return (
    <div>
      <span className="font-medium text-success">Available</span>
      {quote.unitsLeft <= 3 && (
        <p className="mt-0.5 text-xs text-warning">
          Only {quote.unitsLeft} left at this rate
        </p>
      )}
    </div>
  );
}
