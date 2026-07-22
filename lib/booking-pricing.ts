/**
 * booking-pricing — the single source of truth for turning a listing + the
 * traveler's selection (dates, quantities) into a price breakdown.
 *
 * Both the on-page {@link "@/components/sections/detail/booking-widget".BookingWidget}
 * estimate and the multi-step checkout compute totals here, so the price the
 * traveler sees on the listing always matches what they pay. All amounts are
 * base USD, like listing prices; a real backend would return the same shape.
 */

import type { Listing } from "@/types/catalog";
import type { BookingWidgetConfig } from "@/constants/detail";
import { SERVICE_FEE_RATE } from "@/constants/detail";
import { fromISODate } from "@/lib/date";

/** The traveler's raw picks from the booking form. */
export interface BookingSelection {
  /** Range mode: check-in (ISO `YYYY-MM-DD`); "" when not applicable. */
  checkIn: string;
  /** Range mode: check-out (ISO `YYYY-MM-DD`); "" when not applicable. */
  checkOut: string;
  /** Single-date mode: the chosen date (ISO); "" when not applicable. */
  singleDate: string;
  /** Per-field quantities keyed by {@link BookingWidgetConfig} field key. */
  quantities: Record<string, number>;
}

/** A resolved, priceable breakdown for a selection. */
export interface BookingPricing {
  unitPrice: number;
  /** Whole nights/days between the range dates (0 outside range+perDuration). */
  duration: number;
  /** Multiplier applied to the unit price for the duration (duration or 1). */
  durationFactor: number;
  /** Product of the multiplier-field quantities (rooms, travellers, …). */
  multiplierProduct: number;
  /** Whether this vertical requires a valid date range before it can be priced. */
  needsDates: boolean;
  /** True once enough is selected to show a real total. */
  priceable: boolean;
  subtotalUsd: number;
  serviceFeeUsd: number;
  totalUsd: number;
}

/** Whole nights/days between two ISO dates (0 if either is missing or invalid). */
export function durationBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = fromISODate(end).getTime() - fromISODate(start).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Default per-field quantities for a vertical's booking config. */
export function defaultQuantities(config: BookingWidgetConfig): Record<string, number> {
  return Object.fromEntries(config.fields.map((f) => [f.key, f.default]));
}

/**
 * Compute the price breakdown for a listing + selection. Mirrors exactly the
 * math the booking widget shows: `unit × duration × multipliers`, plus a flat
 * {@link SERVICE_FEE_RATE} service fee. Returns `subtotal 0 / priceable false`
 * when the required dates aren't chosen yet.
 */
export function computeBookingPricing(
  listing: Listing,
  config: BookingWidgetConfig,
  selection: BookingSelection,
): BookingPricing {
  const unitPrice = listing.price.amount;
  const duration = durationBetween(selection.checkIn, selection.checkOut);
  const multiplierProduct = config.fields
    .filter((f) => f.multiplier)
    .reduce((product, f) => product * (selection.quantities[f.key] ?? 1), 1);

  const needsDates = config.dateMode === "range" && config.perDuration;
  const priceable = !needsDates || duration >= 1;
  const durationFactor = config.perDuration ? duration : 1;
  const subtotalUsd = priceable ? unitPrice * durationFactor * multiplierProduct : 0;
  const serviceFeeUsd = Math.round(subtotalUsd * SERVICE_FEE_RATE);
  const totalUsd = subtotalUsd + serviceFeeUsd;

  return {
    unitPrice,
    duration,
    durationFactor,
    multiplierProduct,
    needsDates,
    priceable,
    subtotalUsd,
    serviceFeeUsd,
    totalUsd,
  };
}

/**
 * The number of guests/travellers a selection implies, for the booking record.
 * Uses the largest non-multiplier "people" field when present (guests,
 * passengers, attendees, applicants, participants, travellers), else the
 * product of multiplier fields, else 1.
 */
export function guestsFromSelection(
  config: BookingWidgetConfig,
  quantities: Record<string, number>,
): number {
  const peopleKeys = [
    "guests",
    "passengers",
    "attendees",
    "applicants",
    "participants",
    "travellers",
    "travelers",
    "beds",
  ];
  const peopleField = config.fields.find((f) => peopleKeys.includes(f.key));
  if (peopleField) return quantities[peopleField.key] ?? peopleField.default;
  const product = config.fields
    .filter((f) => f.multiplier)
    .reduce((p, f) => p * (quantities[f.key] ?? 1), 1);
  return Math.max(1, product);
}

/** Rooms implied by a selection (the `rooms`/`beds`/`vehicles` field, else 1). */
export function roomsFromSelection(quantities: Record<string, number>): number {
  return quantities.rooms ?? quantities.beds ?? quantities.vehicles ?? 1;
}
