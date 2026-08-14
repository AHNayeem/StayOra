"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Armchair,
  ChevronDown,
  Info,
  Luggage,
  RefreshCw,
  Utensils,
  Wifi,
} from "lucide-react";
import type { FlightOffer } from "@/types/flight";
import { CABIN_SHORT_LABEL } from "@/lib/mock/fares";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { totalDuration } from "@/lib/mock/flights";
import { useLocale } from "@/features/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AirlineLogoStack } from "../airline-logo";
import { EmissionsBadge, FlightBadges } from "./flight-badges";
import { SliceSummary } from "./slice-summary";
import { SegmentTimeline } from "./segment-timeline";
import { FlightCompareToggle } from "./flight-compare-toggle";
import { offerLabel } from "./offer-label";

interface FlightCardProps {
  offer: FlightOffer;
  /** Where "Select" goes. Defaults to the offer's detail page. */
  href?: string;
  className?: string;
}

/**
 * FlightCard — one offer in the results list.
 *
 * The layout answers, in order, the questions travellers actually ask: who flies
 * it, when does it leave and land, how long and how many stops, what's included,
 * and what does it cost. Details expand inline rather than navigating, because
 * comparing two itineraries means opening both — a round-trip to a detail page
 * and back loses your place in the list.
 */
export function FlightCard({ offer, href, className }: FlightCardProps) {
  const { money } = useLocale();
  const [expanded, setExpanded] = useState(false);

  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const airlineCodes = offer.slices.flatMap((s) =>
    s.segments.map((seg) => seg.airlineCode),
  );
  const detailHref = href ?? `/flights/${encodeURIComponent(offer.id)}`;

  const scarce = offer.seatsAvailable <= 5;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-primary/50",
        className,
      )}
    >
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6">
        {/* ---- Itinerary ---------------------------------------------------- */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <AirlineLogoStack codes={airlineCodes} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {offer.mixedAirlines
                  ? `${airline?.name ?? offer.airlineCode} + partners`
                  : (airline?.name ?? offer.airlineCode)}
              </p>
              <p className="text-xs text-muted">
                {CABIN_SHORT_LABEL[offer.cabin]} · {offer.fareBrand}
              </p>
            </div>
            <div className="ms-auto">
              <FlightBadges badges={offer.badges} promoLabel={offer.promoLabel} />
            </div>
          </div>

          <div className="space-y-3">
            {offer.slices.map((slice, i) => (
              <div key={slice.id}>
                {offer.slices.length > 1 && (
                  <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted">
                    {offer.tripType === "round-trip"
                      ? i === 0
                        ? "Outbound"
                        : "Return"
                      : `Flight ${i + 1}`}
                  </p>
                )}
                <SliceSummary slice={slice} compact />
              </div>
            ))}
          </div>

          {/* ---- Inclusions ------------------------------------------------- */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
            <li className="inline-flex items-center gap-1.5">
              <Luggage className="size-3.5 shrink-0" aria-hidden="true" />
              {offer.baggage.checkedKg > 0
                ? `${offer.baggage.checkedKg} kg checked`
                : "Cabin bag only"}
            </li>
            {offer.mealsIncluded && (
              <li className="inline-flex items-center gap-1.5">
                <Utensils className="size-3.5 shrink-0" aria-hidden="true" />
                Meal included
              </li>
            )}
            {offer.wifiAvailable && (
              <li className="inline-flex items-center gap-1.5">
                <Wifi className="size-3.5 shrink-0" aria-hidden="true" />
                Wi-Fi
              </li>
            )}
            <li
              className={cn(
                "inline-flex items-center gap-1.5",
                offer.refundable && "text-success",
              )}
            >
              <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
              {offer.refundable ? "Refundable" : "Non-refundable"}
            </li>
            <li>
              <EmissionsBadge co2Kg={offer.co2Kg} vsAveragePct={offer.co2VsAveragePct} />
            </li>
          </ul>
        </div>

        {/* ---- Price & CTA -------------------------------------------------- */}
        <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-line pt-4 lg:w-52 lg:flex-col lg:items-stretch lg:justify-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="lg:text-right">
            {offer.fare.discountUsd > 0 && (
              <p className="text-xs text-muted line-through">
                {money(offer.fare.totalUsd + offer.fare.discountUsd)}
              </p>
            )}
            <p className="text-2xl font-bold leading-tight text-accent-600">
              {money(offer.fare.totalUsd)}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted lg:justify-end">
              total for {offer.fare.lines.reduce((n, l) => n + l.count, 0)} traveller
              {offer.fare.lines.reduce((n, l) => n + l.count, 0) === 1 ? "" : "s"}
              <Tooltip content="Includes taxes, carrier charges and our booking fee.">
                <Info className="size-3 shrink-0" aria-hidden="true" />
              </Tooltip>
            </p>
            {scarce && (
              <p className="mt-1 text-xs font-medium text-danger">
                Only {offer.seatsAvailable} left at this fare
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:mt-3">
            <Link
              href={detailHref}
              className={buttonVariants({ variant: "primary", size: "md", fullWidth: true })}
            >
              Select
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`offer-details-${offer.id}`}
              className="text-primary"
            >
              {expanded ? "Hide details" : "Flight details"}
              <ChevronDown
                className={cn("size-4 transition-transform", expanded && "rotate-180")}
                aria-hidden="true"
              />
            </Button>
            {/* Compare sits with the other actions rather than as an overlay on
                the card: there is no media here to overlay, and a traveller
                weighing four fares is already looking at this column. */}
            <FlightCompareToggle offerId={offer.id} label={offerLabel(offer)} />
          </div>
        </div>
      </div>

      {/* ---- Expanded detail ---------------------------------------------- */}
      {expanded && (
        <div
          id={`offer-details-${offer.id}`}
          className="border-t border-line bg-surface-muted/40 p-4 sm:p-5"
        >
          <div className="space-y-6">
            {offer.slices.map((slice, i) => (
              <div key={slice.id}>
                <p className="mb-3 text-sm font-semibold text-ink">
                  {offer.slices.length > 1
                    ? offer.tripType === "round-trip"
                      ? i === 0
                        ? "Outbound journey"
                        : "Return journey"
                      : `Flight ${i + 1}`
                    : "Your journey"}
                </p>
                <SegmentTimeline slice={slice} />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Armchair className="size-3.5 shrink-0" aria-hidden="true" />
              Total journey time {Math.floor(totalDuration(offer) / 60)}h{" "}
              {totalDuration(offer) % 60}m
            </p>
            <Link
              href={detailHref}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Full fare rules & booking
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
