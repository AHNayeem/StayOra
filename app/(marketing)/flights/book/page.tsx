import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOffer } from "@/services/flight.service";
import { FlightBookingFlow } from "@/features/flights/booking/flight-booking-flow";

export const metadata: Metadata = {
  title: "Complete your flight booking",
  robots: { index: false, follow: false },
};

type SearchParams = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** First value of a possibly-repeated query param. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Booking entry point.
 *
 * The offer is resolved server-side from `?offer=`, so a refresh or a shared
 * link mid-flow rebuilds the same itinerary at the same price instead of
 * dumping the traveller back to search. An unresolvable offer is a 404 rather
 * than an empty flow — better to say the fare is gone than to collect passport
 * details for a flight that can't be booked.
 */
export default async function FlightBookingPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const offerId = first(params.offer);
  if (!offerId) notFound();

  const offer = await getOffer(offerId);
  if (!offer) notFound();

  return (
    <main className="flex-1">
      <FlightBookingFlow offer={offer} initialCouponCode={first(params.coupon) || undefined} />
    </main>
  );
}
