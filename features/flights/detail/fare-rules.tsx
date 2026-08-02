"use client";

import {
  Ban,
  CalendarSync,
  CheckCircle2,
  CircleAlert,
  Luggage,
  RefreshCw,
  Users,
} from "lucide-react";
import type { FlightOffer } from "@/types/flight";
import { FARE_BRAND_RULES } from "@/lib/mock/fares";
import { useLocale } from "@/features/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * FareRules — what this fare actually permits.
 *
 * Written as plain statements with an explicit yes/no marker rather than a table
 * of jargon, because "changes permitted subject to fare difference plus
 * applicable penalty" is how people end up surprised. Where a fee applies, the
 * amount is shown; where something is simply not allowed, it says so.
 */
export function FareRules({ offer }: { offer: FlightOffer }) {
  const { money } = useLocale();
  const rules = FARE_BRAND_RULES[offer.fareBrand];

  const items = [
    {
      allowed: offer.changeable,
      icon: CalendarSync,
      title: "Date & time changes",
      body: offer.changeable
        ? offer.changeFeeUsd > 0
          ? `Permitted for a fee of ${money(offer.changeFeeUsd)} per traveller, plus any difference in fare.`
          : "Permitted free of charge, plus any difference in fare."
        : "Not permitted. You'd need to book a new flight.",
    },
    {
      allowed: offer.refundable,
      icon: RefreshCw,
      title: "Cancellation & refund",
      body: offer.refundable
        ? offer.cancellationFeeUsd > 0
          ? `Refundable up to 24 hours before departure, minus ${money(offer.cancellationFeeUsd)} per traveller.`
          : "Fully refundable up to departure."
        : "Non-refundable. Government taxes may still be reclaimable — contact support.",
    },
    {
      allowed: offer.baggage.checkedKg > 0,
      icon: Luggage,
      title: "Checked baggage",
      body:
        offer.baggage.checkedKg > 0
          ? `${offer.baggage.checkedPieces} piece up to ${offer.baggage.checkedKg} kg included, plus ${offer.baggage.cabinKg} kg cabin baggage.`
          : `Not included — ${offer.baggage.cabinKg} kg cabin baggage only. Add checked bags during booking for less than at the airport.`,
    },
    {
      allowed: true,
      icon: Users,
      title: "Name changes",
      body: "Names must match your travel document exactly. Spelling corrections are free within 24 hours of booking; name transfers to another person aren't permitted.",
    },
  ];

  return (
    <section
      aria-labelledby="fare-rules-heading"
      className="rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="fare-rules-heading" className="text-base font-semibold text-ink">
          Fare rules
        </h2>
        <Badge variant={offer.refundable ? "success" : "neutral"}>
          {offer.fareBrand}
        </Badge>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-field bg-surface-muted/70 p-3 text-sm text-body">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        {rules.note} {rules.seatSelection}.
      </p>

      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-8 shrink-0 place-items-center rounded-field",
                  item.allowed
                    ? "bg-emerald-500/12 text-emerald-600"
                    : "bg-danger/10 text-danger",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {item.title}
                  {item.allowed ? (
                    <CheckCircle2
                      className="size-3.5 shrink-0 text-emerald-600"
                      aria-label="Permitted"
                    />
                  ) : (
                    <Ban className="size-3.5 shrink-0 text-danger" aria-label="Not permitted" />
                  )}
                </p>
                <p className="mt-0.5 text-sm text-body">{item.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
