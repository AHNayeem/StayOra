/**
 * Seat-map generator.
 *
 * Derives a plausible cabin layout from the aircraft type: narrowbodies get 3-3,
 * widebodies 3-4-3, and premium cabins ahead of them get progressively wider
 * pitch and fewer seats per row. Occupancy is seeded from the segment id so the
 * same flight always shows the same taken seats — a map that reshuffled on every
 * navigation would make seat selection feel broken.
 */

import type {
  CabinClass,
  FlightSegment,
  Seat,
  SeatKind,
  SeatMap,
  SeatRow,
} from "@/types/flight";
import { SeededRandom } from "@/lib/random";
import { AIRCRAFT_BY_CODE } from "./airlines";

/** Column letters per layout, with the aisle positions that split them. */
interface Layout {
  columns: string[];
  aisleAfter: string[];
  /** Seats per row — drives the `kind` derivation. */
  groups: number[];
}

const NARROW_ECONOMY: Layout = {
  columns: ["A", "B", "C", "D", "E", "F"],
  aisleAfter: ["C"],
  groups: [3, 3],
};
const NARROW_PREMIUM: Layout = {
  columns: ["A", "C", "D", "F"],
  aisleAfter: ["C"],
  groups: [2, 2],
};
const WIDE_ECONOMY: Layout = {
  columns: ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K"],
  aisleAfter: ["C", "G"],
  groups: [3, 4, 3],
};
const WIDE_PREMIUM: Layout = {
  columns: ["A", "C", "D", "G", "H", "K"],
  aisleAfter: ["C", "G"],
  groups: [2, 2, 2],
};
const WIDE_BUSINESS: Layout = {
  columns: ["A", "C", "D", "G", "H", "K"],
  aisleAfter: ["C", "G"],
  groups: [2, 2, 2],
};
const FIRST: Layout = {
  columns: ["A", "D", "K"],
  aisleAfter: ["A", "D"],
  groups: [1, 1, 1],
};

/** Which layout a cabin section uses on a given airframe. */
function layoutFor(cabin: CabinClass, wideBody: boolean): Layout {
  if (cabin === "first") return FIRST;
  if (cabin === "business") return wideBody ? WIDE_BUSINESS : NARROW_PREMIUM;
  if (cabin === "premium-economy") return wideBody ? WIDE_PREMIUM : NARROW_PREMIUM;
  return wideBody ? WIDE_ECONOMY : NARROW_ECONOMY;
}

/**
 * Classify a column as window / aisle / middle from the row's seat groups.
 * The first and last seat of the row are windows; seats adjacent to an aisle
 * boundary are aisles; everything else is a middle.
 */
function classify(columns: string[], groups: number[]): Record<string, SeatKind> {
  const kinds: Record<string, SeatKind> = {};
  let index = 0;
  const aisleEdges = new Set<number>();
  let cursor = 0;
  for (let g = 0; g < groups.length; g++) {
    cursor += groups[g];
    if (g < groups.length - 1) {
      aisleEdges.add(cursor - 1); // last seat before the aisle
      aisleEdges.add(cursor); // first seat after the aisle
    }
  }
  for (const column of columns) {
    const isWindow = index === 0 || index === columns.length - 1;
    kinds[column] = isWindow ? "window" : aisleEdges.has(index) ? "aisle" : "middle";
    index += 1;
  }
  return kinds;
}

/** Row counts per cabin section on a given airframe. */
function sectionRows(wideBody: boolean): Array<{ cabin: CabinClass; rows: number }> {
  return wideBody
    ? [
        { cabin: "first", rows: 2 },
        { cabin: "business", rows: 6 },
        { cabin: "premium-economy", rows: 5 },
        { cabin: "economy", rows: 24 },
      ]
    : [
        { cabin: "business", rows: 3 },
        { cabin: "economy", rows: 23 },
      ];
}

/** Seat surcharge, USD — position and legroom are what people pay for. */
function seatPrice(
  cabin: CabinClass,
  kind: SeatKind,
  extraLegroom: boolean,
  rowFromFront: number,
): number {
  // Premium cabins include seat selection in the fare.
  if (cabin === "business" || cabin === "first") return 0;
  let price = cabin === "premium-economy" ? 12 : 0;
  if (extraLegroom) price += 26;
  if (kind === "window") price += 8;
  else if (kind === "aisle") price += 6;
  // Front-of-cabin seats deplane first and carry a small premium.
  if (rowFromFront <= 3) price += 7;
  return price;
}

/**
 * Build the seat map for one segment. Only the cabin the traveller booked is
 * selectable; sections ahead of it render as `blocked` so the map still reads
 * like a real aircraft without offering seats the fare doesn't allow.
 */
export function buildSeatMap(segment: FlightSegment): SeatMap {
  const aircraft = AIRCRAFT_BY_CODE[segment.aircraftCode];
  const wideBody = aircraft?.wideBody ?? false;
  const rng = new SeededRandom(`seatmap:${segment.id}:${segment.flightNumber}`);

  const bookedCabin = segment.cabin;
  const rows: SeatRow[] = [];
  let rowNumber = 1;

  for (const section of sectionRows(wideBody)) {
    // Skip cabins that don't exist on this airframe's configuration.
    if (section.rows === 0) continue;
    const layout = layoutFor(section.cabin, wideBody);
    const kinds = classify(layout.columns, layout.groups);
    const sectionStart = rowNumber;

    for (let r = 0; r < section.rows; r++) {
      const rowFromFront = r + 1;
      // One exit row per economy section, placed a third of the way back.
      const exitRow =
        section.cabin === "economy" && r === Math.floor(section.rows / 3);
      const seats: Seat[] = layout.columns.map((column) => {
        const kind = kinds[column];
        // Extra legroom: exit rows and the first row of each cabin section.
        const extraLegroom = exitRow || r === 0;
        const selectable = section.cabin === bookedCabin;
        // Load factor rises toward the back of economy, as it does in life.
        const occupancy = section.cabin === "economy" ? 0.32 + r * 0.012 : 0.24;
        const occupied = rng.bool(occupancy);
        return {
          id: `${rowNumber}${column}`,
          row: rowNumber,
          column,
          kind,
          status: !selectable ? "blocked" : occupied ? "occupied" : "available",
          priceUsd: selectable
            ? seatPrice(section.cabin, kind, extraLegroom, rowFromFront)
            : 0,
          extraLegroom,
          emergencyExit: exitRow,
          cabin: section.cabin,
        };
      });

      rows.push({ row: rowNumber, cabin: section.cabin, exitRow, seats });
      rowNumber += 1;
    }

    // Leave a numbering gap between cabins, as airlines do.
    if (rowNumber > sectionStart) rowNumber += 1;
  }

  const bookedLayout = layoutFor(bookedCabin, wideBody);

  return {
    segmentId: segment.id,
    flightNumber: segment.flightNumber,
    aircraftName: aircraft?.name ?? "Aircraft",
    fromCode: segment.fromCode,
    toCode: segment.toCode,
    columns: bookedLayout.columns,
    aisleAfter: bookedLayout.aisleAfter,
    rows,
  };
}

/** Total surcharge for a set of chosen seats on one map. */
export function seatMapPrice(map: SeatMap, seatIds: string[]): number {
  const wanted = new Set(seatIds);
  let total = 0;
  for (const row of map.rows) {
    for (const seat of row.seats) {
      if (wanted.has(seat.id)) total += seat.priceUsd;
    }
  }
  return total;
}

/** Look up one seat on a map. */
export function findSeat(map: SeatMap, seatId: string): Seat | undefined {
  for (const row of map.rows) {
    const hit = row.seats.find((s) => s.id === seatId);
    if (hit) return hit;
  }
  return undefined;
}
