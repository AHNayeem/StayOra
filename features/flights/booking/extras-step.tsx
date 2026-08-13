"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Minus, Plus } from "lucide-react";
import type {
  AncillaryOption,
  AncillarySelection,
  FlightOffer,
} from "@/types/flight";
import { getAncillaries, getIncludedAncillaries } from "@/services/flight.service";
import {
  ANCILLARY_GROUPS,
  ancillariesTotal,
  ancillaryUnitNoun,
  fillCity,
  totalCheckedKg,
} from "@/lib/mock/ancillaries";
import {
  destinationCityName,
  destinationCodeOf,
  stayNights,
} from "@/lib/mock/destination-extras";
import { seatedPassengers } from "@/lib/mock/fares";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/shared/lucide-icon";
import { cn } from "@/lib/utils";

interface ExtrasStepProps {
  offer: FlightOffer;
  value: AncillarySelection[];
  onChange: (next: AncillarySelection[]) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * ExtrasStep — baggage, meals, assistance, protection, transfers, and the
 * destination extras a traveller needs once they land: a local eSIM, things to
 * do, and a bed.
 *
 * Grouped by what the traveller is actually deciding rather than by how the
 * airline files it. Three details matter:
 *
 *  - **Extras already in the fare are shown as included, never sold.** A
 *    business-class ticket bundles lounge access; offering to sell it again is
 *    how a booking flow loses trust.
 *  - **Per-passenger pricing is spelled out.** "$18 × 3 travellers = $54" is
 *    stated on the row, because a party of four discovering the multiplication
 *    at the payment screen is the classic drip-pricing complaint. Hotels say the
 *    same thing in nights: "$189 × 4 nights = $756".
 *  - **Destination extras are the real catalogue.** Activities and hotels are
 *    the listings Otithee already sells, each linking out to its own page, so
 *    "add a hotel" doesn't mean buying something the traveller can't inspect.
 *
 * Special assistance is free and stays free — it's a right, not an upsell.
 */
export function ExtrasStep({
  offer,
  value,
  onChange,
  onBack,
  onNext,
}: ExtrasStepProps) {
  const { money } = useLocale();
  const [options, setOptions] = useState<AncillaryOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAncillaries(offer.id).then((result) => {
      if (!cancelled) setOptions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [offer.id]);

  const included = getIncludedAncillaries(offer);
  const seated = Math.max(1, seatedPassengers(offer.passengers));
  const total = ancillariesTotal(value, offer.passengers);
  const checkedKg = totalCheckedKg(offer.baggage, value, offer.passengers);

  const city = destinationCityName(destinationCodeOf(offer));
  // Hotels are priced per night, so "Add" has to mean a length of stay. The gap
  // between landing and the return flight is the only number the traveller has
  // already told us — start there, and let the stepper correct it.
  const nights = stayNights(offer);

  const quantityOf = (id: string) =>
    value.find((s) => s.optionId === id)?.quantity ?? 0;

  const setQuantity = (id: string, quantity: number) => {
    const next = value.filter((s) => s.optionId !== id);
    if (quantity > 0) next.push({ optionId: id, quantity });
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {/* Baggage summary — the number people actually want to know. */}
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="text-sm text-body">
          Your fare includes{" "}
          <strong className="font-semibold text-ink">
            {offer.baggage.cabinKg} kg cabin baggage
          </strong>{" "}
          {offer.baggage.checkedKg > 0 ? (
            <>
              and{" "}
              <strong className="font-semibold text-ink">
                {offer.baggage.checkedKg} kg checked
              </strong>{" "}
              per traveller.
            </>
          ) : (
            <>
              and <strong className="font-semibold text-ink">no checked baggage</strong>.
            </>
          )}{" "}
          {checkedKg > offer.baggage.checkedKg * seated && (
            <span className="text-primary">
              With your extras, your party can check {checkedKg} kg in total.
            </span>
          )}
        </p>
      </div>

      {included.length > 0 && (
        <section className="rounded-card border border-emerald-500/30 bg-emerald-500/8 p-4">
          <h2 className="mb-2 text-sm font-semibold text-emerald-800">
            Already included in your fare
          </h2>
          <ul className="flex flex-wrap gap-2">
            {included.map((option) => (
              <li key={option.id}>
                <Badge
                  variant="success"
                  icon={<Check className="size-3" aria-hidden="true" />}
                >
                  {option.label}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {options === null ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-card border border-line bg-surface p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : (
        ANCILLARY_GROUPS.map((group) => {
          const groupOptions = options.filter((o) => o.category === group.category);
          if (groupOptions.length === 0) return null;

          return (
            <section
              key={group.category}
              className="rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
                  <Icon name={group.icon} className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-ink">
                    {fillCity(group.title, city)}
                  </h2>
                  <p className="text-sm text-muted">
                    {fillCity(group.description, city)}
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {groupOptions.map((option) => (
                  <li key={option.id}>
                    <ExtraRow
                      option={option}
                      quantity={quantityOf(option.id)}
                      seated={seated}
                      // Everything else is added one at a time; a stay is added
                      // for the length of the trip.
                      addQuantity={option.category === "stay" ? nights : 1}
                      onQuantity={(next) => setQuantity(option.id, next)}
                    />
                  </li>
                ))}
              </ul>

              {group.category === "assistance" && (
                <p className="mt-3 text-xs text-muted">
                  Special assistance is provided free of charge. Requests are passed to the
                  airline, who will confirm arrangements before departure.
                </p>
              )}
            </section>
          );
        })
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="md"
          onClick={onBack}
          leftIcon={<ArrowLeft className="size-4" aria-hidden="true" />}
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <p className="text-sm text-body">
              Extras: <span className="font-semibold text-ink">{money(total)}</span>
            </p>
          )}
          <Button variant="primary" size="lg" onClick={onNext}>
            Review booking
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ExtraRowProps {
  option: AncillaryOption;
  quantity: number;
  /** Seated head count — what a per-traveller price multiplies by. */
  seated: number;
  /** Quantity "Add" sets: 1 for most things, the night count for a stay. */
  addQuantity: number;
  onQuantity: (next: number) => void;
}

/**
 * One purchasable row, from a $16 vegan meal to a four-night hotel stay.
 *
 * A single row rather than a card grid for the destination extras: an eSIM, a
 * tour and a hotel are the same decision at different prices, and a traveller
 * comparing them across two visual languages compares nothing. The extra fields
 * a listing carries — thumbnail, review score, its own page — attach to the row
 * without changing its shape.
 */
function ExtraRow({ option, quantity, seated, addQuantity, onQuantity }: ExtraRowProps) {
  const { money } = useLocale();

  const max = option.maxQuantity ?? 1;
  const selected = quantity > 0;
  // Per-traveller extras charge the head count; per-booking ones charge their
  // own quantity, which for a stay is the number of nights.
  const units = option.perBooking ? quantity : quantity * seated;
  const lineTotal = option.free ? 0 : option.priceUsd * units;
  const highlights = option.highlights ?? [];

  // A multi-unit extra whose natural starting quantity isn't 1 (a stay) opens
  // with an Add button and only then reveals the stepper — starting a hotel at
  // "0 nights" with a disabled minus is a worse first impression than "Add".
  const stepper = max > 1 && (selected || addQuantity <= 1);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-field border p-3 transition-colors",
        selected ? "border-primary bg-primary-50/50" : "border-line",
      )}
    >
      {option.imageUrl ? (
        <Image
          src={option.imageUrl}
          alt=""
          width={56}
          height={56}
          sizes="56px"
          className="size-14 shrink-0 rounded-field object-cover"
        />
      ) : (
        <Icon
          name={option.icon}
          className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted")}
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{option.label}</p>
        <p className="text-xs text-muted">{option.description}</p>

        {(option.rating !== undefined || highlights.length > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {option.rating !== undefined && (
              <RatingStars
                value={option.rating}
                size="sm"
                showValue
                reviewCount={option.reviewCount}
              />
            )}
            {highlights.map((highlight) => (
              <Badge key={highlight} variant="neutral" size="sm">
                {highlight}
              </Badge>
            ))}
          </div>
        )}

        {selected && !option.free && (
          <p className="mt-1 text-xs font-medium text-primary">
            {money(option.priceUsd)} × {units} {ancillaryUnitNoun(option, units)} ={" "}
            {money(lineTotal)}
          </p>
        )}

        {option.href && (
          <a
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            Full details
            <ArrowUpRight className="size-3" aria-hidden="true" />
            <span className="sr-only">for {option.label} (opens in a new tab)</span>
          </a>
        )}

        {selected && option.note && (
          <p className="mt-1 text-xs text-muted">{option.note}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-ink">
          {option.free ? (
            <span className="text-success">Free</span>
          ) : (
            <>
              {money(option.priceUsd)}
              <span className="text-xs font-normal text-muted">
                {" / "}
                {ancillaryUnitNoun(option, 1)}
              </span>
            </>
          )}
        </span>

        {stepper ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuantity(quantity - 1)}
              disabled={quantity === 0}
              aria-label={
                option.unitLabel
                  ? `Remove one ${option.unitLabel} from ${option.label}`
                  : `Remove one ${option.label}`
              }
              className={cn(
                "grid size-8 place-items-center rounded-full border transition-colors",
                quantity === 0
                  ? "cursor-not-allowed border-line text-muted/40"
                  : "border-line text-ink hover:border-primary hover:text-primary",
              )}
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="min-w-5 text-center text-sm font-semibold tabular-nums text-ink"
            >
              {quantity}
              {option.unitLabel && (
                <span className="ml-1 text-xs font-normal text-muted">
                  {ancillaryUnitNoun(option, quantity)}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(quantity + 1)}
              disabled={quantity >= max}
              aria-label={
                option.unitLabel
                  ? `Add one ${option.unitLabel} to ${option.label}`
                  : `Add one ${option.label}`
              }
              className={cn(
                "grid size-8 place-items-center rounded-full border transition-colors",
                quantity >= max
                  ? "cursor-not-allowed border-line text-muted/40"
                  : "border-line text-ink hover:border-primary hover:text-primary",
              )}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </span>
        ) : (
          <Button
            variant={selected ? "primary" : "outline"}
            size="sm"
            onClick={() => onQuantity(selected ? 0 : Math.min(addQuantity, max))}
            aria-pressed={selected}
          >
            {selected ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                Added
              </>
            ) : (
              "Add"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
