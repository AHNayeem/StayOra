/**
 * Alternative dates — the answer to "not available" that isn't a dead end.
 *
 * Travellers are more flexible than a date picker assumes. When the dates they
 * asked for are sold out (or simply expensive), the inventory engine already
 * knows which nearby windows *are* free and what they cost — this file just
 * asks it, for a shifted range at a time, and returns the options worth showing.
 *
 * Two uses, one function:
 *   • sold out  → the closest available windows, so the journey continues
 *   • available → cheaper nearby windows, so the traveller saves and the
 *                 property fills a softer night
 *
 * Deterministic: same inputs, same suggestions, on the server and the client.
 */

import { quoteStay, type PropertyRef, type RatePlanId } from "./inventory";

export interface AlternativeDate {
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Room subtotal for the same units, comparable to the original. */
  total: number;
  currency: string;
  averageNightly: number;
  /** Days from the requested check-in. Negative is earlier. */
  shiftDays: number;
  /** Saving against the requested window; negative means it costs more. */
  savingVsRequested: number;
  unitsLeft: number;
}

export interface AlternativeSearch {
  property: PropertyRef;
  roomTypeId: string;
  ratePlanId: RatePlanId;
  checkIn: string;
  checkOut: string;
  units: number;
  guests?: number;
  /** How many days either side to consider. */
  window?: number;
  /** How many suggestions to return. */
  limit?: number;
}

function shiftDate(date: string, days: number): string {
  const ms = new Date(`${date}T00:00:00.000Z`).getTime() + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const diff =
    new Date(`${checkOut}T00:00:00.000Z`).getTime() -
    new Date(`${checkIn}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}

/**
 * Available windows near the requested one, cheapest first.
 *
 * Past dates are skipped — suggesting last week helps nobody.
 */
export function suggestAlternativeDates(search: AlternativeSearch): AlternativeDate[] {
  const {
    property,
    roomTypeId,
    ratePlanId,
    checkIn,
    checkOut,
    units,
    guests,
    window = 7,
    limit = 4,
  } = search;
  if (!checkIn) return [];

  const stayNights = nightsBetween(checkIn, checkOut || checkIn);
  const requested = quoteStay({
    property,
    roomTypeId,
    ratePlanId,
    checkIn,
    checkOut: checkOut || checkIn,
    units,
    guests,
  });
  const requestedTotal = requested.available ? requested.roomSubtotal : Number.POSITIVE_INFINITY;
  const today = new Date().toISOString().slice(0, 10);

  const options: AlternativeDate[] = [];
  for (let shift = -window; shift <= window; shift += 1) {
    if (shift === 0) continue;
    const start = shiftDate(checkIn, shift);
    if (start < today) continue;
    const end = shiftDate(start, stayNights);

    const quote = quoteStay({
      property,
      roomTypeId,
      ratePlanId,
      checkIn: start,
      checkOut: end,
      units,
      guests,
    });
    if (!quote.available) continue;

    options.push({
      checkIn: start,
      checkOut: end,
      nights: quote.nightCount,
      total: quote.roomSubtotal,
      currency: quote.currency,
      averageNightly: quote.averageNightly,
      shiftDays: shift,
      savingVsRequested: Number.isFinite(requestedTotal)
        ? Math.round((requestedTotal - quote.roomSubtotal) * 100) / 100
        : 0,
      unitsLeft: quote.unitsLeft,
    });
  }

  // Cheapest first, then closest to the requested dates — a traveller trades
  // money for convenience in that order far more often than the reverse.
  options.sort(
    (a, b) => a.total - b.total || Math.abs(a.shiftDays) - Math.abs(b.shiftDays),
  );
  return options.slice(0, limit);
}

/** Only the cheaper ones — used when the requested dates *are* available. */
export function cheaperAlternatives(search: AlternativeSearch): AlternativeDate[] {
  return suggestAlternativeDates(search).filter((option) => option.savingVsRequested > 0);
}
