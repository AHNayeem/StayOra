"use client";

import Image from "next/image";
import { useMemo } from "react";
import {
  BedDouble,
  Check,
  CircleAlert,
  Coffee,
  Maximize2,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import {
  getRoomTypes,
  quoteStay,
  ratePlansFor,
  unitNoun,
  type RatePlanId,
  type RoomType,
  type StayQuote,
} from "@/features/dashboard/domain";
import { toPropertyRef, useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

/**
 * Room type × rate plan matrix.
 *
 * One component serves the listing page and checkout, so the price, the
 * availability and the "only 2 left" copy are identical in both places — they
 * are the same {@link quoteStay} call. Sold-out and closed-out combinations are
 * shown rather than hidden: a traveller learns more from a greyed row with a
 * reason on it than from an option that silently isn't there.
 */

export interface RoomRateChoice {
  roomTypeId: string;
  ratePlanId: RatePlanId;
}

interface RoomRateSelectorProps {
  listing: Listing;
  checkIn: string;
  checkOut: string;
  units: number;
  guests: number;
  value: RoomRateChoice;
  onChange: (choice: RoomRateChoice) => void;
  /** `page` on the listing detail, `compact` inside checkout. */
  variant?: "page" | "compact";
  className?: string;
}

interface RoomOption {
  room: RoomType;
  quotes: { planId: RatePlanId; quote: StayQuote }[];
  cheapest: number;
  anyAvailable: boolean;
  unitsLeft: number;
}

export function RoomRateSelector({
  listing,
  checkIn,
  checkOut,
  units,
  guests,
  value,
  onChange,
  variant = "page",
  className,
}: RoomRateSelectorProps) {
  const { money } = useLocale();
  const noun = unitNoun(listing.vertical);

  const options = useDomainValue<RoomOption[]>(() => {
    const property = toPropertyRef(listing);
    const plans = ratePlansFor(listing.vertical);
    return getRoomTypes(property).map((room) => {
      const quotes = plans.map((plan) => ({
        planId: plan.id,
        quote: quoteStay({
          property,
          roomTypeId: room.id,
          ratePlanId: plan.id,
          checkIn,
          checkOut,
          units,
          guests,
        }),
      }));
      const bookable = quotes.filter((q) => q.quote.available);
      return {
        room,
        quotes,
        cheapest: bookable.length
          ? Math.min(...bookable.map((q) => q.quote.roomSubtotal))
          : Math.min(...quotes.map((q) => q.quote.roomSubtotal)),
        anyAvailable: bookable.length > 0,
        unitsLeft: Math.max(0, ...quotes.map((q) => q.quote.unitsLeft)),
      };
    });
  }, [listing.id, checkIn, checkOut, units, guests, listing.vertical]);

  const nothingBookable = useMemo(
    () => options.length > 0 && options.every((o) => !o.anyAvailable),
    [options],
  );

  if (!checkIn) {
    return (
      <p className={cn("rounded-card border border-line bg-surface-muted/50 p-5 text-sm text-muted", className)}>
        Choose your dates to see which {noun.many} are available and what they cost.
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {nothingBookable && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm text-amber-800"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Nothing is available for these dates or this party size. Try shifting your
          dates, or reducing the number of {noun.many}.
        </p>
      )}

      {options.map(({ room, quotes, cheapest, anyAvailable, unitsLeft }) => {
        const selected = value.roomTypeId === room.id;
        return (
          <article
            key={room.id}
            className={cn(
              "overflow-hidden rounded-card border transition-colors",
              selected ? "border-primary shadow-card" : "border-line",
              !anyAvailable && "opacity-70",
            )}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              {variant === "page" && (
                <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-field sm:h-24 sm:w-36">
                  <Image src={room.image} alt="" fill sizes="144px" className="object-cover" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-ink">{room.name}</h3>
                  <p className="text-sm text-muted">
                    from{" "}
                    <span className="text-base font-bold text-accent-600">{money(cheapest)}</span>
                  </p>
                </div>

                <p className="mt-1 text-sm text-body">{room.description}</p>

                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <li className="flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden="true" />
                    Sleeps {room.maxOccupancy}
                  </li>
                  <li className="flex items-center gap-1">
                    <BedDouble className="size-3.5" aria-hidden="true" />
                    {room.bedding}
                  </li>
                  {room.sizeSqm && (
                    <li className="flex items-center gap-1">
                      <Maximize2 className="size-3.5" aria-hidden="true" />
                      {room.sizeSqm} m²
                    </li>
                  )}
                </ul>

                {variant === "page" && room.amenities.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 5).map((amenity) => (
                      <li
                        key={amenity}
                        className="rounded-pill bg-surface-muted px-2.5 py-0.5 text-[11px] text-body"
                      >
                        {amenity}
                      </li>
                    ))}
                  </ul>
                )}

                {anyAvailable && unitsLeft > 0 && unitsLeft <= 3 && (
                  <p className="mt-2 text-xs font-semibold text-danger">
                    Only {unitsLeft} {unitsLeft === 1 ? noun.one : noun.many} left for your dates
                  </p>
                )}
                {!anyAvailable && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
                    <XCircle className="size-3.5" aria-hidden="true" />
                    Sold out for these dates
                  </p>
                )}
              </div>
            </div>

            <ul className="divide-y divide-line border-t border-line bg-surface-muted/30">
              {quotes.map(({ planId, quote }) => {
                const isSelected = selected && value.ratePlanId === planId;
                const blocked = !quote.available;
                return (
                  <li key={planId}>
                    <button
                      type="button"
                      disabled={blocked}
                      aria-pressed={isSelected}
                      onClick={() => onChange({ roomTypeId: room.id, ratePlanId: planId })}
                      className={cn(
                        "flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors",
                        isSelected && "bg-primary-50",
                        blocked
                          ? "cursor-not-allowed opacity-60"
                          : "hover:bg-primary-50/60",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border-2",
                          isSelected ? "border-primary bg-primary text-white" : "border-line",
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-ink">
                            {quote.ratePlanName}
                          </span>
                          {quote.includesBreakfast && (
                            <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <Coffee className="size-3" aria-hidden="true" />
                              Breakfast
                            </span>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold",
                              quote.refundable
                                ? "bg-emerald-500/12 text-emerald-700"
                                : "bg-amber-500/12 text-amber-700",
                            )}
                          >
                            <ShieldCheck className="size-3" aria-hidden="true" />
                            {quote.refundable ? "Refundable" : "Non-refundable"}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {blocked
                            ? quote.blockers[0]?.message
                            : quote.cancellationSummary}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-base font-bold text-ink">
                          {money(quote.roomSubtotal)}
                        </span>
                        {quote.nightCount > 1 && (
                          <span className="block text-[11px] text-muted">
                            {money(quote.averageNightly)} avg / night
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

/** First bookable room/rate for a stay — the default selection. */
export function defaultChoice(
  listing: Listing,
  checkIn: string,
  checkOut: string,
  units: number,
  guests: number,
): RoomRateChoice {
  const property = toPropertyRef(listing);
  const rooms = getRoomTypes(property);
  const plans = ratePlansFor(listing.vertical);
  for (const room of rooms) {
    for (const plan of plans) {
      const quote = quoteStay({
        property,
        roomTypeId: room.id,
        ratePlanId: plan.id,
        checkIn,
        checkOut,
        units,
        guests,
      });
      if (quote.available) return { roomTypeId: room.id, ratePlanId: plan.id };
    }
  }
  return { roomTypeId: rooms[0]?.id ?? "", ratePlanId: plans[0]?.id ?? "standard" };
}
