import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BookingVertical } from "@/types/booking";
import { VERTICALS } from "@/constants/verticals";
import { BOOKING_CONFIG } from "@/constants/detail";
import { getListingBySlug } from "@/services/catalog";
import { findRatePlan } from "@/features/dashboard/domain";
import { CheckoutFlow, type CheckoutIntent } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

type SearchParams = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** First value of a possibly-repeated query param. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function count(value: string | string[] | undefined, fallback: number, max = 16): number {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= max ? Math.floor(parsed) : fallback;
}

/**
 * Checkout entry — resolves the listing and the traveller's intent from the
 * query string the booking widget or the room selector produced, then hands off
 * to the client {@link CheckoutFlow}. Renders `notFound()` for an unknown
 * vertical or slug so the URL can't be tampered into an invalid checkout. The
 * room, rate and price are all re-derived client-side from the inventory
 * engine, so a hand-edited query string cannot change what anything costs.
 */
export default async function CheckoutPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const vertical = first(params.v) as BookingVertical;
  const slug = first(params.slug);

  if (!slug || !(vertical in VERTICALS)) notFound();

  const listing = await getListingBySlug(vertical, slug);
  if (!listing) notFound();

  const config = BOOKING_CONFIG[vertical];
  const checkIn = first(params.in) || first(params.on);
  const checkOut = config.dateMode === "range" ? first(params.out) : checkIn;
  const rate = first(params.rate);

  // Legacy widget params (`q_rooms`, `q_guests`, …) still work.
  const units = count(params.units ?? params.q_rooms ?? params.q_beds ?? params.q_vehicles, 1, 8);
  const guests = count(
    params.guests ?? params.q_guests ?? params.q_travellers ?? params.q_attendees ?? params.q_applicants,
    Math.max(1, units),
  );

  const intent: CheckoutIntent = {
    checkIn,
    checkOut,
    units,
    guests,
    roomTypeId: first(params.room) || undefined,
    // Rate plans are records now, not a closed union: accept any id the
    // catalogue actually sells and let the quote fall back to standard for the
    // rest, rather than silently dropping a merchant's own plan from a link.
    ratePlanId: rate && findRatePlan(rate) ? rate : undefined,
  };

  return <CheckoutFlow listing={listing} intent={intent} />;
}
