"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarSearch, Loader2, Sparkles } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { BOOKING_CONFIG } from "@/constants/detail";
import {
  isPerNight,
  nightsBetween,
  track,
  unitNoun,
  type RatePlanId,
} from "@/features/dashboard/domain";
import {
  quoteCheckout,
  toPropertyRef,
  useCustomerEmail,
  useDomainValue,
} from "@/features/booking";
import {
  cheaperAlternatives,
  suggestAlternativeDates,
  type AlternativeDate,
} from "@/features/dashboard/domain/alternatives";
import { AlternativeDates } from "@/components/booking/alternative-dates";
import { PriceBreakdown } from "@/components/booking/price-breakdown";
import { WaitlistPrompt } from "@/components/booking/waitlist-prompt";
import { useLocale } from "@/features/i18n";
import {
  RoomRateSelector,
  defaultChoice,
  type RoomRateChoice,
} from "@/components/booking/room-rate-selector";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { controlClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** One column of the search row: label on top, a 44px control beneath it. */
const fieldColumn = "flex min-w-0 flex-col gap-1.5";
const fieldLabel = "text-sm font-medium text-ink";
const stepperShell =
  "flex h-11 items-center rounded-field border border-line bg-surface px-3";

/**
 * "Check availability" — the section that turns a listing page into a bookable
 * one.
 *
 * It shares the room/rate matrix and the pricing engine with checkout, so the
 * price quoted here is the price charged there. Selecting a date range holds
 * nothing: the inventory hold is taken at the payment step, which is where it
 * genuinely needs to be.
 */
export function AvailabilitySection({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { money } = useLocale();
  const config = BOOKING_CONFIG[listing.vertical];
  const noun = unitNoun(listing.vertical);
  const perNight = isPerNight(listing.vertical);
  const email = useCustomerEmail();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [units, setUnits] = useState(1);
  const [guests, setGuests] = useState(2);
  const [choice, setChoice] = useState<RoomRateChoice | null>(null);
  const [navigating, setNavigating] = useState(false);

  const hasDates = Boolean(checkIn) && (!perNight || Boolean(checkOut));
  const nights = perNight ? nightsBetween(checkIn, checkOut) : 1;

  const resolved = useDomainValue(
    () =>
      hasDates
        ? (choice ?? defaultChoice(listing, checkIn, perNight ? checkOut : checkIn, units, guests))
        : null,
    [
      hasDates,
      choice?.roomTypeId,
      choice?.ratePlanId,
      listing.id,
      checkIn,
      checkOut,
      units,
      guests,
    ],
  );

  const quote = useDomainValue(
    () =>
      resolved
        ? quoteCheckout({
            listing,
            roomTypeId: resolved.roomTypeId,
            ratePlanId: resolved.ratePlanId,
            checkIn,
            checkOut: perNight ? checkOut : checkIn,
            units,
            guests,
            addOns: [],
            customerEmail: email,
          })
        : null,
    [resolved?.roomTypeId, resolved?.ratePlanId, listing.id, checkIn, checkOut, units, guests, email],
  );

  /**
   * Nearby dates worth offering.
   *
   * Sold out → the closest windows that *are* free, so the traveller has
   * somewhere to go. Available → only the cheaper ones, so the suggestion is a
   * saving rather than noise.
   */
  const alternatives = useDomainValue<AlternativeDate[]>(
    () => {
      if (!resolved || !hasDates || !quote) return [];
      const search = {
        property: toPropertyRef(listing),
        roomTypeId: resolved.roomTypeId,
        ratePlanId: resolved.ratePlanId,
        checkIn,
        checkOut: perNight ? checkOut : checkIn,
        units,
        guests,
      };
      return quote.available ? cheaperAlternatives(search) : suggestAlternativeDates(search);
    },
    [
      resolved?.roomTypeId,
      resolved?.ratePlanId,
      listing.id,
      checkIn,
      checkOut,
      units,
      guests,
      quote?.available,
      hasDates,
    ],
  );

  const pickAlternative = (option: AlternativeDate) => {
    setCheckIn(option.checkIn);
    if (perNight) setCheckOut(option.checkOut);
    setChoice(null);
    track("alternative_date_selected", {
      listing: listing.slug,
      shiftDays: option.shiftDays,
      saving: option.savingVsRequested,
    });
  };

  const goToCheckout = () => {
    if (!resolved) return;
    setNavigating(true);
    track("availability_checked", {
      listing: listing.slug,
      vertical: listing.vertical,
      nights,
      units,
    });
    const params = new URLSearchParams({
      v: listing.vertical,
      slug: listing.slug,
      room: resolved.roomTypeId,
      rate: resolved.ratePlanId satisfies RatePlanId,
      units: String(units),
      guests: String(guests),
    });
    if (config.dateMode === "range") {
      params.set("in", checkIn);
      params.set("out", checkOut);
    } else if (checkIn) {
      params.set("on", checkIn);
    }
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <section id="availability" className="scroll-mt-24">
      <h2 className="text-h4 text-ink">Check availability</h2>
      <p className="mt-1 text-body">
        Live prices and remaining {noun.many} for your dates, straight from the property&rsquo;s
        calendar.
      </p>

      <div className="mt-5 rounded-card border border-line bg-surface-muted/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {config.dateMode !== "none" && (
            <label className={fieldColumn}>
              <span className={fieldLabel}>
                {config.checkInLabel ?? config.singleDateLabel ?? "Date"}
              </span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => {
                  setCheckIn(event.target.value);
                  if (!perNight) setCheckOut(event.target.value);
                  else if (checkOut && checkOut <= event.target.value) setCheckOut("");
                  setChoice(null);
                }}
                className={cn(controlClasses(false), "h-11", !checkIn && "text-muted")}
              />
            </label>
          )}
          {config.dateMode === "range" && (
            <label className={fieldColumn}>
              <span className={fieldLabel}>{config.checkOutLabel ?? "Check-out"}</span>
              <input
                type="date"
                value={checkOut}
                min={checkIn || undefined}
                onChange={(event) => {
                  setCheckOut(event.target.value);
                  setChoice(null);
                }}
                className={cn(controlClasses(false), "h-11", !checkOut && "text-muted")}
              />
            </label>
          )}
          {/* Steppers repeat the label-above-control shape of the date fields so
              every column in the row shares one baseline and one 44px control. */}
          <div className={fieldColumn}>
            <span className={fieldLabel}>{noun.many[0].toUpperCase() + noun.many.slice(1)}</span>
            <div className={stepperShell}>
              <Stepper
                label={noun.many[0].toUpperCase() + noun.many.slice(1)}
                value={units}
                min={1}
                max={8}
                size="sm"
                className="w-full justify-center"
                onChange={(value) => {
                  setUnits(value);
                  setChoice(null);
                }}
              />
            </div>
          </div>
          <div className={fieldColumn}>
            <span className={fieldLabel}>Guests</span>
            <div className={stepperShell}>
              <Stepper
                label="Guests"
                value={guests}
                min={1}
                max={16}
                size="sm"
                className="w-full justify-center"
                onChange={(value) => {
                  setGuests(value);
                  setChoice(null);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {!hasDates ? (
        <p className="mt-4 flex items-center gap-2 rounded-card border border-line bg-surface p-5 text-sm text-muted">
          <CalendarSearch className="size-4 shrink-0" aria-hidden="true" />
          Pick your dates above to see which {noun.many} are free and what they cost.
        </p>
      ) : (
        <>
          <RoomRateSelector
            listing={listing}
            checkIn={checkIn}
            checkOut={perNight ? checkOut : checkIn}
            units={units}
            guests={guests}
            value={resolved!}
            onChange={setChoice}
            className="mt-5"
          />

          {/* Not available is no longer a dead end: shift the dates, or ask to
              be told when they open up. */}
          {quote && !quote.available && (
            <>
              <AlternativeDates
                options={alternatives ?? []}
                soldOut
                onPick={pickAlternative}
              />
              <WaitlistPrompt
                listing={listing}
                property={toPropertyRef(listing)}
                roomTypeId={resolved!.roomTypeId}
                roomTypeName={quote.stay.roomTypeName}
                checkIn={checkIn}
                checkOut={perNight ? checkOut : checkIn}
                units={units}
                guests={guests}
              />
            </>
          )}

          {quote?.available && (alternatives?.length ?? 0) > 0 && (
            <AlternativeDates options={alternatives ?? []} soldOut={false} onPick={pickAlternative} />
          )}

          {/* Date-by-date pricing with the reason each night costs what it
              does. The same component checkout uses, reading the same quote. */}
          {quote?.available && perNight && nights > 0 && (
            <div className="mt-5 rounded-card border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink">Your price, night by night</h3>
              <PriceBreakdown quote={quote.stay} className="mt-3" />
            </div>
          )}

          {quote?.available && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-card border border-primary/25 bg-primary-50/60 p-5">
              <div className="min-w-0">
                <p className="text-sm text-body">
                  {units} × {quote.stay.roomTypeName} · {quote.stay.ratePlanName}
                  {nights > 1 ? ` · ${nights} nights` : ""}
                </p>
                <p className="text-h4 font-bold text-ink">{money(quote.money.total)}</p>
                <p className="text-xs text-muted">
                  Includes {money(quote.money.taxes)} tax and {money(quote.money.fees)} service
                  fee.
                </p>
                {quote.pointsEarned > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-primary-700">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    Earns {quote.pointsEarned.toLocaleString()} points
                  </p>
                )}
              </div>
              <Button size="lg" onClick={goToCheckout} disabled={navigating}>
                {navigating && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Reserve now
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
