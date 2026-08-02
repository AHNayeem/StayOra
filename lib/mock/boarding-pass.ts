/**
 * Boarding-pass derivation.
 *
 * A boarding pass isn't stored — it's *derived* from a booking plus the segment
 * and passenger it belongs to, exactly as an airline's DCS derives it at
 * check-in. Deriving rather than persisting means seat changes and gate updates
 * flow through automatically, and there's no second copy of the truth to drift.
 *
 * The barcode payload follows the shape of IATA's BCBP (Bar Coded Boarding Pass)
 * standard closely enough to be recognisable, but it is a placeholder: it will
 * not scan at a real gate, and nothing in the module pretends otherwise.
 */

import type { BoardingPass, FlightBooking, FlightSegment } from "@/types/flight";
import { SeededRandom } from "@/lib/random";
import { dateOf } from "@/lib/flight-time";

/** Boarding zone from cabin and seat row — front cabins board first. */
function zoneFor(cabin: string, seat: string): string {
  if (cabin === "first") return "Zone 1";
  if (cabin === "business") return "Zone 1";
  if (cabin === "premium-economy") return "Zone 2";
  const row = Number(seat.replace(/\D/g, "")) || 30;
  if (row <= 18) return "Zone 4";
  if (row <= 26) return "Zone 3";
  return "Zone 2"; // rear rows board earlier on most carriers
}

/** Julian day-of-year, as BCBP encodes the date of flight. */
function julianDay(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const start = Date.UTC(y, 0, 1);
  const day = Date.UTC(y, m - 1, d);
  return Math.round((day - start) / 86_400_000) + 1;
}

/**
 * BCBP-style payload: format code, passenger name, PNR, route, carrier, flight
 * number, Julian date, cabin, seat and check-in sequence.
 */
function barcodePayload(options: {
  passengerName: string;
  pnr: string;
  segment: FlightSegment;
  seat: string;
  sequence: number;
  cabinLetter: string;
}): string {
  const { passengerName, pnr, segment, seat, sequence, cabinLetter } = options;
  const name = passengerName.toUpperCase().replace(/\s+/g, "/").slice(0, 20).padEnd(20, " ");
  const flightDigits = segment.flightNumber.replace(/\D/g, "").padStart(4, "0");
  return [
    "M1",
    name,
    `E${pnr}`,
    `${segment.fromCode}${segment.toCode}${segment.airlineCode}`,
    flightDigits,
    String(julianDay(dateOf(segment.departLocal))).padStart(3, "0"),
    cabinLetter,
    seat.padStart(4, "0"),
    String(sequence).padStart(4, "0"),
  ].join(" ");
}

const CABIN_LETTER: Record<string, string> = {
  economy: "Y",
  "premium-economy": "W",
  business: "J",
  first: "F",
};

/**
 * Every boarding pass for a booking — one per passenger per segment. Infants
 * are excluded: they travel on an adult's lap and have no seat or sequence.
 */
export function buildBoardingPasses(booking: FlightBooking): BoardingPass[] {
  const passes: BoardingPass[] = [];
  const fastTrack = booking.ancillaries.some(
    (a) => a.optionId === "fast-track" || a.optionId === "lounge" || a.optionId === "priority-boarding",
  );
  const premiumCabin = booking.cabin === "business" || booking.cabin === "first";

  for (const slice of booking.slices) {
    for (const segment of slice.segments) {
      for (const passenger of booking.passengers) {
        if (passenger.type === "infant") continue;

        const seat = passenger.seats?.[segment.id] ?? "—";
        const rng = new SeededRandom(`bp:${booking.id}:${segment.id}:${passenger.id}`);
        const passengerName = `${passenger.firstName} ${passenger.lastName}`;
        const sequence = rng.int(12, 168);

        passes.push({
          id: `bp_${segment.id}_${passenger.id}`,
          bookingReference: booking.reference,
          pnr: booking.pnr,
          passengerName,
          segmentId: segment.id,
          flightNumber: segment.flightNumber,
          airlineCode: segment.airlineCode,
          fromCode: segment.fromCode,
          toCode: segment.toCode,
          departLocal: segment.departLocal,
          boardingLocal: segment.boardingLocal,
          gate: segment.gate,
          terminal: segment.departTerminal,
          seat,
          zone: zoneFor(booking.cabin, seat),
          sequence,
          cabin: booking.cabin,
          barcodeData: barcodePayload({
            passengerName,
            pnr: booking.pnr,
            segment,
            seat,
            sequence,
            cabinLetter: CABIN_LETTER[booking.cabin] ?? "Y",
          }),
          fastTrack: fastTrack || premiumCabin,
        });
      }
    }
  }

  return passes;
}

/**
 * Boarding passes are released 24 hours before departure — the same window the
 * airlines use. The caller supplies "now" so this stays free of wall-clock reads
 * and remains testable.
 */
export function boardingPassAvailable(
  booking: FlightBooking,
  nowLocalIso: string,
): boolean {
  if (booking.status === "cancelled") return false;
  const firstDeparture = booking.slices[0]?.departLocal;
  if (!firstDeparture) return false;
  const hoursUntil =
    (Date.parse(`${firstDeparture}:00Z`) - Date.parse(`${nowLocalIso}:00Z`)) / 3_600_000;
  return hoursUntil <= 24;
}

/**
 * A stable, printable "barcode" rendered as a run of bars. Encodes the payload
 * as varying bar widths so each pass looks distinct — a visual placeholder for
 * the real 2D barcode, never a scannable one.
 */
export function barcodeBars(payload: string): number[] {
  const rng = new SeededRandom(payload);
  return Array.from({ length: 64 }, () => rng.int(1, 4));
}
