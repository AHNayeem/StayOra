import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOffer } from "@/services/flight.service";
import { decodeOfferId } from "@/lib/mock/flights";
import { airportLabel } from "@/lib/mock/airports";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { FlightDetailView } from "@/features/flights/detail/flight-detail-view";

/** Params for this dynamic route (a Promise in the App Router — always awaited). */
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const decoded = decodeOfferId(decodeURIComponent(id));
  if (!decoded) return { title: "Flight" };

  const first = decoded.query.legs[0];
  const last = decoded.query.legs[decoded.query.legs.length - 1];

  return {
    title: `${airportLabel(first.from)} to ${airportLabel(last.to)}`,
    description: `${CABIN_LABEL[decoded.query.cabin]} fare from ${airportLabel(first.from)} to ${airportLabel(last.to)} — full itinerary, baggage allowance and fare rules.`,
    // Offers are transient and per-query; indexing them would fill search
    // results with fares that no longer exist.
    robots: { index: false, follow: true },
  };
}

/**
 * Flight offer detail.
 *
 * The offer is rebuilt from its id (see {@link decodeOfferId}) rather than read
 * from a session, so this page works on a cold load, a shared link or a
 * refresh — the same guarantee a real `GET /offers/:id` gives. An id that can't
 * be decoded, or that no longer resolves to a fare, is a genuine 404.
 */
export default async function FlightDetailPage({ params }: Params) {
  const { id } = await params;
  const offerId = decodeURIComponent(id);

  const decoded = decodeOfferId(offerId);
  if (!decoded) notFound();

  const offer = await getOffer(offerId);
  if (!offer) notFound();

  return (
    <main className="flex-1">
      <FlightDetailView offer={offer} query={decoded.query} />
    </main>
  );
}
