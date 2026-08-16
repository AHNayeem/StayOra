"use client";

import { CalendarDays, Info, Tag } from "lucide-react";
import type { StayQuote } from "@/features/dashboard/domain";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

/**
 * The traveller's night-by-night breakdown.
 *
 * Every figure comes from the {@link StayQuote} the pricing engine produced —
 * this component does no arithmetic, which is what guarantees the number on
 * screen is the number that will be charged.
 *
 * What it shows and what it hides is deliberate. A traveller learns *why* a
 * Friday costs more than a Tuesday ("Weekend +18%", "Peak season +30%"), which
 * is the difference between a price feeling arbitrary and feeling fair. They
 * never see a rule id, a priority, a calculation mode or an occupancy figure:
 * those are the property's business, not theirs. Manual overrides are shown as
 * "Set by the property" rather than exposing the internal note.
 */
export function PriceBreakdown({
  quote,
  /** Collapse the nightly list behind a summary. Long stays default to closed. */
  collapsible = true,
  className,
}: {
  quote: StayQuote;
  collapsible?: boolean;
  className?: string;
}) {
  const { money, date } = useLocale();
  const { pricing, units, nightCount } = quote;

  if (nightCount === 0) return null;

  const nightly = (
    <ul className="mt-2 space-y-1.5">
      {quote.nights.map((night) => (
        <li key={night.date} className="flex items-baseline justify-between gap-3 text-xs">
          <span className="min-w-0">
            <span className="text-body">{date(night.date)}</span>
            {night.overridden ? (
              <span className="mt-0.5 block text-muted">Set by the property</span>
            ) : (
              night.reasons.length > 0 && (
                <span className="mt-0.5 block text-muted">
                  {night.reasons.join(" · ")}
                </span>
              )
            )}
          </span>
          <span className="shrink-0 tabular-nums text-ink">{money(night.price)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={cn("text-sm", className)}>
      {collapsible ? (
        <details
          className="rounded-field bg-surface-muted/50 px-3 py-2"
          open={nightCount <= 4}
        >
          <summary className="cursor-pointer text-xs font-medium text-body">
            <CalendarDays className="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
            {nightCount} {nightCount === 1 ? "night" : "nights"} ×{" "}
            {money(quote.averageNightly)} average
          </summary>
          {nightly}
        </details>
      ) : (
        <div className="rounded-field bg-surface-muted/50 px-3 py-2">
          <p className="text-xs font-medium text-body">
            {nightCount} {nightCount === 1 ? "night" : "nights"} ·{" "}
            {money(quote.averageNightly)} average
          </p>
          {nightly}
        </div>
      )}

      {/* Stay-level adjustments: booking window, length of stay, extra guests.
          Reported separately from the nightly list because they apply to the
          stay as a whole — showing them per night would be a fiction. */}
      {pricing.stayAdjustments.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pricing.stayAdjustments.map((entry) => (
            <li
              key={entry.ruleId}
              className={cn(
                "flex items-center justify-between gap-3 text-xs",
                entry.amount < 0 ? "text-emerald-700" : "text-body",
              )}
            >
              <span className="min-w-0 truncate">{entry.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {entry.amount < 0 ? "−" : "+"}
                {money(Math.abs(entry.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pricing.discounts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {pricing.discounts.map((entry) => (
            <li
              key={entry.ruleId}
              className="flex items-center justify-between gap-3 text-xs text-emerald-700"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Tag className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                −{money(Math.abs(entry.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
        <span className="text-body">
          {quote.roomTypeName}
          {units > 1 ? ` × ${units}` : ""}
        </span>
        <span className="font-semibold tabular-nums text-ink">
          {money(quote.roomSubtotal)}
        </span>
      </div>
    </div>
  );
}

/**
 * A one-line explanation of what is moving this stay's price, for places too
 * small for the full table (the rate card, a search result).
 */
export function PriceReasonSummary({
  quote,
  className,
}: {
  quote: StayQuote;
  className?: string;
}) {
  const reasons = quote.pricing.explanations;
  if (reasons.length === 0) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-muted", className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{reasons.slice(0, 3).join(" · ")}</span>
    </p>
  );
}
