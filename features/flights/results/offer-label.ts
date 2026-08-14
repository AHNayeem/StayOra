import type { FlightOffer } from "@/types/flight";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { formatTime } from "@/lib/flight-time";

/**
 * A one-line human name for an offer — carrier, route and departure time.
 *
 * Shared by the compare toggle's toast, the tray chips' accessible labels and
 * the comparison dialog, so the same flight is called the same thing wherever
 * the traveller meets it. Time is included because a route on its own doesn't
 * distinguish two offers from the same search.
 */
export function offerLabel(offer: FlightOffer): string {
  const airline = AIRLINES_BY_CODE[offer.airlineCode]?.name ?? offer.airlineCode;
  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];
  const route =
    offer.tripType === "round-trip"
      ? `${first.fromCode} ⇄ ${first.toCode}`
      : offer.slices.map((s) => s.fromCode).concat(last.toCode).join(" → ");
  return `${airline} · ${route}, ${formatTime(first.departLocal)}`;
}
