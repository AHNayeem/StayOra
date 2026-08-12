"use client";

import Link from "next/link";
import { Luggage, Plane } from "lucide-react";
import type { AIBlock, AIFlightRef } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { AirlineLogo } from "@/features/flights/airline-logo";
import { totalDuration, totalStops } from "@/services/flight.service";
import { formatDuration, formatTime } from "@/lib/flight-time";
import { AiText } from "./ai-text";
import { BlockShell } from "./block-shell";

type FlightsBlock = Extract<AIBlock, { kind: "flights" }>;

/**
 * FlightBlock — fare results in the chat column.
 *
 * Reads the same derived values the flight results page uses
 * ({@link totalDuration}, {@link totalStops}) so a fare summarised here matches
 * the card the traveller sees after clicking through, down to the minute.
 */
export function FlightBlock({
  block,
  onCompare,
}: {
  block: FlightsBlock;
  onCompare?: () => void;
}) {
  return (
    <BlockShell
      title={block.title}
      note={block.note}
      moreHref={block.moreHref}
      moreLabel="All fares"
      action={
        block.comparable && onCompare ? (
          <button
            type="button"
            onClick={onCompare}
            className="rounded-pill border border-line px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Compare
          </button>
        ) : null
      }
    >
      <ul className="divide-y divide-line">
        {block.items.map((item) => (
          <FlightRow key={item.offer.id} item={item} />
        ))}
      </ul>
    </BlockShell>
  );
}

function FlightRow({ item }: { item: AIFlightRef }) {
  const { money } = useLocale();
  const { offer } = item;
  const outbound = offer.slices[0];
  const inbound = offer.slices.length > 1 ? offer.slices[offer.slices.length - 1] : undefined;
  const stops = totalStops(offer);

  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <AirlineLogo code={offer.airlineCode} size="sm" />
        <span className="text-xs font-semibold text-ink">{offer.fareBrand}</span>
        {offer.badges.includes("cheapest") && (
          <span className="rounded-pill bg-primary-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-700">
            Cheapest
          </span>
        )}
        {offer.badges.includes("fastest") && (
          <span className="rounded-pill bg-accent-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-600">
            Fastest
          </span>
        )}
        <span className="ml-auto text-base font-bold text-accent-600">
          {money(offer.fare.totalUsd)}
        </span>
      </div>

      <SliceLine
        label="Out"
        from={outbound.fromCode}
        to={outbound.toCode}
        depart={outbound.departLocal}
        arrive={outbound.arriveLocal}
        minutes={outbound.durationMinutes}
        stops={outbound.stops}
      />
      {inbound && (
        <SliceLine
          label="Back"
          from={inbound.fromCode}
          to={inbound.toCode}
          depart={inbound.departLocal}
          arrive={inbound.arriveLocal}
          minutes={inbound.durationMinutes}
          stops={inbound.stops}
        />
      )}

      {item.reason && (
        <p className="text-xs text-body">
          <AiText text={item.reason} />
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Luggage className="size-3.5" aria-hidden="true" />
          {offer.baggage.checkedKg > 0 ? `${offer.baggage.checkedKg} kg` : "Cabin only"}
        </span>
        <span className="text-xs text-muted">
          {formatDuration(totalDuration(offer))} · {stops === 0 ? "non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
        </span>
        <Link
          href={item.href}
          className="ml-auto rounded-pill bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
        >
          View fare
        </Link>
      </div>
    </li>
  );
}

function SliceLine({
  label,
  from,
  to,
  depart,
  arrive,
  minutes,
  stops,
}: {
  label: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  minutes: number;
  stops: number;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-body">
      <span className="w-9 shrink-0 font-semibold text-muted">{label}</span>
      <span className="font-semibold text-ink">{formatTime(depart)}</span>
      <span className="text-muted">{from}</span>
      <span className="flex flex-1 items-center gap-1 text-muted">
        <span className="h-px flex-1 bg-line" />
        <Plane className="size-3 shrink-0" aria-hidden="true" />
        <span className="h-px flex-1 bg-line" />
      </span>
      <span className="text-muted">{to}</span>
      <span className="font-semibold text-ink">{formatTime(arrive)}</span>
      <span className="hidden shrink-0 text-muted sm:inline">
        {formatDuration(minutes)}
        {stops > 0 ? ` · ${stops}✈` : ""}
      </span>
    </div>
  );
}
