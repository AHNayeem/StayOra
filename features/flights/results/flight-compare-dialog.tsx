"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Check, Minus, X } from "lucide-react";
import type { FlightOffer } from "@/types/flight";
import { CABIN_SHORT_LABEL } from "@/lib/mock/fares";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { totalDuration, totalStops } from "@/lib/mock/flights";
import { formatDuration } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Modal } from "@/components/ui/modal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AirlineLogoStack } from "../airline-logo";
import { removeFromFlightCompare } from "../compare-store";
import { SliceSummary } from "./slice-summary";
import { offerLabel } from "./offer-label";

/**
 * The flight comparison table.
 *
 * Every column is derived from the offer itself — nothing is stored, and nothing
 * is re-priced here: these are the same fares the results list showed, read from
 * the same offers. The one thing this view adds is *the winner of each row*.
 * Travellers don't compare to admire a table, they compare to find which flight
 * is cheapest, fastest, greenest or most generous with a bag, and reading that
 * off four columns of similar-looking numbers is exactly the work software
 * should do for them.
 *
 * Rows are ordered the way the decision is actually made: price, then the
 * itinerary, then the things that change the price's meaning (bags, refunds,
 * comfort).
 */

/** The lowest/highest value of each compared metric, so a row can mark its winner. */
interface Bests {
  price: number;
  duration: number;
  stops: number;
  co2: number;
  baggage: number;
}

interface FlightCompareDialogProps {
  open: boolean;
  onClose: () => void;
  offers: FlightOffer[];
}

export function FlightCompareDialog({
  open,
  onClose,
  offers,
}: FlightCompareDialogProps) {
  const { money } = useLocale();

  const bests: Bests = useMemo(
    () => ({
      price: Math.min(...offers.map((o) => o.fare.totalUsd)),
      duration: Math.min(...offers.map(totalDuration)),
      stops: Math.min(...offers.map(totalStops)),
      co2: Math.min(...offers.map((o) => o.co2Kg)),
      baggage: Math.max(...offers.map((o) => o.baggage.checkedKg)),
    }),
    [offers],
  );

  /**
   * A winner is only worth marking when the columns actually differ — labelling
   * every column "Lowest total" on four identically-priced fares is noise, not
   * information.
   */
  const varies = useMemo(
    () => ({
      price: new Set(offers.map((o) => o.fare.totalUsd)).size > 1,
      duration: new Set(offers.map(totalDuration)).size > 1,
      stops: new Set(offers.map(totalStops)).size > 1,
      co2: new Set(offers.map((o) => o.co2Kg)).size > 1,
      baggage: new Set(offers.map((o) => o.baggage.checkedKg)).size > 1,
    }),
    [offers],
  );

  const paxCount = (offer: FlightOffer) =>
    offer.fare.lines.reduce((n, l) => n + l.count, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compare flights"
      description={`${offers.length} side by side. Fares include taxes, carrier charges and our booking fee.`}
      size="xl"
      className="max-w-6xl"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <caption className="sr-only">
            Comparison of {offers.length} flights by price, itinerary, journey time,
            stops, baggage, flexibility, on-board features and emissions
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-36 p-2 text-left align-bottom text-xs font-semibold uppercase tracking-wide text-muted"
              >
                <span className="sr-only">Attribute</span>
              </th>
              {offers.map((offer) => (
                <th key={offer.id} scope="col" className="w-56 p-2 align-bottom">
                  <CompareHeader offer={offer} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="align-top">
            <Row label="Price">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  {offer.fare.discountUsd > 0 && (
                    <p className="text-xs text-muted line-through">
                      {money(offer.fare.totalUsd + offer.fare.discountUsd)}
                    </p>
                  )}
                  <p
                    className={cn(
                      "text-base font-bold text-ink",
                      offer.fare.totalUsd === bests.price &&
                        varies.price &&
                        "text-primary",
                    )}
                  >
                    {money(offer.fare.totalUsd)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    total for {paxCount(offer)} traveller
                    {paxCount(offer) === 1 ? "" : "s"} · {money(offer.fare.perAdultUsd)}{" "}
                    each
                  </p>
                  <Winner
                    show={offer.fare.totalUsd === bests.price && varies.price}
                    label="Lowest total"
                  />
                </Cell>
              ))}
            </Row>

            <Row label="Itinerary">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <div className="space-y-3">
                    {offer.slices.map((slice, i) => (
                      <div key={slice.id}>
                        {offer.slices.length > 1 && (
                          <p className="mb-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted">
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
                </Cell>
              ))}
            </Row>

            <Row label="Journey time">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <p
                    className={cn(
                      "font-medium text-ink",
                      totalDuration(offer) === bests.duration &&
                        varies.duration &&
                        "text-primary",
                    )}
                  >
                    {formatDuration(totalDuration(offer))}
                  </p>
                  <Winner
                    show={totalDuration(offer) === bests.duration && varies.duration}
                    label="Fastest"
                  />
                </Cell>
              ))}
            </Row>

            <Row label="Stops">
              {offers.map((offer) => {
                const stops = totalStops(offer);
                const layovers = offer.slices
                  .flatMap((s) => s.layovers)
                  .map((l) => `${l.airportCode} ${formatDuration(l.durationMinutes)}`);
                return (
                  <Cell key={offer.id}>
                    <p
                      className={cn(
                        "font-medium",
                        stops === 0 ? "text-success" : "text-ink",
                        stops === bests.stops && stops > 0 && varies.stops && "text-primary",
                      )}
                    >
                      {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
                    </p>
                    {layovers.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted">{layovers.join(" · ")}</p>
                    )}
                    <Winner
                      show={stops === bests.stops && stops > 0 && varies.stops}
                      label="Fewest stops"
                    />
                  </Cell>
                );
              })}
            </Row>

            <Row label="Baggage">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <p
                    className={cn(
                      "font-medium text-ink",
                      offer.baggage.checkedKg === bests.baggage &&
                        bests.baggage > 0 &&
                        varies.baggage &&
                        "text-primary",
                    )}
                  >
                    {offer.baggage.checkedKg > 0
                      ? `${offer.baggage.checkedKg} kg checked`
                      : "Cabin bag only"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {offer.baggage.checkedKg > 0 &&
                      `${offer.baggage.checkedPieces} piece${offer.baggage.checkedPieces > 1 ? "s" : ""} · `}
                    {offer.baggage.cabinKg} kg cabin
                  </p>
                  <Winner
                    show={
                      offer.baggage.checkedKg === bests.baggage &&
                      bests.baggage > 0 &&
                      varies.baggage
                    }
                    label="Most baggage"
                  />
                </Cell>
              ))}
            </Row>

            <Row label="Refund">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <p
                    className={cn(
                      "font-medium",
                      offer.refundable ? "text-success" : "text-body",
                    )}
                  >
                    {offer.refundable ? "Refundable" : "Non-refundable"}
                  </p>
                  {offer.refundable && (
                    <p className="mt-0.5 text-xs text-muted">
                      {offer.cancellationFeeUsd > 0
                        ? `${money(offer.cancellationFeeUsd)} cancellation fee`
                        : "No cancellation fee"}
                    </p>
                  )}
                </Cell>
              ))}
            </Row>

            <Row label="Changes">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <p className="font-medium text-body">
                    {offer.changeable ? "Changes allowed" : "No changes"}
                  </p>
                  {offer.changeable && (
                    <p className="mt-0.5 text-xs text-muted">
                      {offer.changeFeeUsd > 0
                        ? `${money(offer.changeFeeUsd)} change fee`
                        : "No change fee"}
                    </p>
                  )}
                </Cell>
              ))}
            </Row>

            {/* On-board features read as ticks, one line each — the only rows where
                "does it have it or not" is the whole question. */}
            <FeatureRow
              label="Meal included"
              offers={offers}
              has={(o) => o.mealsIncluded}
            />
            <FeatureRow label="Wi-Fi" offers={offers} has={(o) => o.wifiAvailable} />
            <FeatureRow
              label="Entertainment"
              offers={offers}
              has={(o) => o.entertainment}
            />

            <Row label="Emissions">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <p
                    className={cn(
                      "font-medium text-ink",
                      offer.co2Kg === bests.co2 && varies.co2 && "text-primary",
                    )}
                  >
                    {offer.co2Kg} kg CO₂
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      offer.co2VsAveragePct < 0 ? "text-success" : "text-muted",
                    )}
                  >
                    {offer.co2VsAveragePct === 0
                      ? "Route average"
                      : `${Math.abs(offer.co2VsAveragePct)}% ${offer.co2VsAveragePct < 0 ? "below" : "above"} average`}
                  </p>
                  <Winner
                    show={offer.co2Kg === bests.co2 && varies.co2}
                    label="Lowest emissions"
                  />
                </Cell>
              ))}
            </Row>

            <Row label="Seats left">
              {offers.map((offer) => (
                <Cell key={offer.id}>
                  <p
                    className={cn(
                      "font-medium",
                      offer.seatsAvailable <= 5 ? "text-danger" : "text-body",
                    )}
                  >
                    {offer.seatsAvailable} at this fare
                  </p>
                </Cell>
              ))}
            </Row>

            <tr className="border-t border-line">
              <th scope="row" className="p-2 text-left">
                <span className="sr-only">Book</span>
              </th>
              {offers.map((offer) => (
                <td key={offer.id} className="p-2">
                  <Link
                    href={`/flights/${encodeURIComponent(offer.id)}`}
                    onClick={onClose}
                    className={buttonVariants({
                      variant: "primary",
                      size: "sm",
                      fullWidth: true,
                    })}
                  >
                    Select
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-line">
      <th
        scope="row"
        className="p-2 text-left text-xs font-semibold uppercase tracking-wide text-muted"
      >
        {label}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="p-2 text-body">{children}</td>;
}

function Winner({ show, label }: { show: boolean; label: string }) {
  if (!show) return null;
  return <p className="mt-0.5 text-xs font-medium text-primary">{label}</p>;
}

function FeatureRow({
  label,
  offers,
  has,
}: {
  label: string;
  offers: FlightOffer[];
  has: (offer: FlightOffer) => boolean;
}) {
  return (
    <tr className="border-t border-line/60">
      <th scope="row" className="p-2 text-left font-medium text-body">
        {label}
      </th>
      {offers.map((offer) => (
        <td key={offer.id} className="p-2">
          {has(offer) ? (
            <>
              <Check className="size-4 text-success" aria-hidden="true" />
              <span className="sr-only">Included</span>
            </>
          ) : (
            <>
              <Minus className="size-4 text-muted/60" aria-hidden="true" />
              <span className="sr-only">Not included</span>
            </>
          )}
        </td>
      ))}
    </tr>
  );
}

function CompareHeader({ offer }: { offer: FlightOffer }) {
  const airline = AIRLINES_BY_CODE[offer.airlineCode];
  const codes = offer.slices.flatMap((s) => s.segments.map((seg) => seg.airlineCode));
  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="flex items-start justify-between gap-2">
        <AirlineLogoStack codes={codes} size="sm" />
        <button
          type="button"
          onClick={() => removeFromFlightCompare(offer.id)}
          aria-label={`Remove ${offerLabel(offer)} from comparison`}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-sm font-semibold text-ink">
        {offer.mixedAirlines
          ? `${airline?.name ?? offer.airlineCode} + partners`
          : (airline?.name ?? offer.airlineCode)}
      </p>
      <p className="text-xs font-normal text-muted">
        {CABIN_SHORT_LABEL[offer.cabin]} · {offer.fareBrand}
      </p>
    </div>
  );
}
