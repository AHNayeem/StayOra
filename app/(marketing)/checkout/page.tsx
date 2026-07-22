import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BookingVertical } from "@/types/booking";
import { VERTICALS } from "@/constants/verticals";
import { BOOKING_CONFIG } from "@/constants/detail";
import { defaultQuantities, type BookingSelection } from "@/lib/booking-pricing";
import { getListingBySlug } from "@/services/catalog";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

type SearchParams = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** First value of a possibly-repeated query param. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Checkout entry — resolves the listing and the traveller's selection from the
 * query string the booking widget produced, then hands off to the client
 * {@link CheckoutFlow}. Renders `notFound()` for an unknown vertical or slug so
 * the URL can't be tampered into an invalid checkout.
 */
export default async function CheckoutPage({ searchParams }: SearchParams) {
  const params = await searchParams;
  const vertical = first(params.v) as BookingVertical;
  const slug = first(params.slug);

  if (!slug || !(vertical in VERTICALS)) notFound();

  const listing = await getListingBySlug(vertical, slug);
  if (!listing) notFound();

  const config = BOOKING_CONFIG[vertical];
  const quantities = defaultQuantities(config);
  for (const field of config.fields) {
    const raw = Number(first(params[`q_${field.key}`]));
    if (Number.isFinite(raw) && raw >= field.min && raw <= field.max) {
      quantities[field.key] = raw;
    }
  }

  const selection: BookingSelection = {
    checkIn: first(params.in),
    checkOut: first(params.out),
    singleDate: first(params.on),
    quantities,
  };

  return <CheckoutFlow listing={listing} selection={selection} />;
}
