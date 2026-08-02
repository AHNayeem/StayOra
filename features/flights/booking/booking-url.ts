/**
 * Booking-flow URLs.
 *
 * The flow is driven entirely by the offer id in the URL, with no server session
 * and no state handed between routes. That means a refresh mid-booking (or a
 * shared link, or a back button) re-derives the same offer at the same price
 * rather than dropping the traveller back to search — the single most common way
 * booking flows lose people.
 */

/** Entry point for the booking flow, optionally carrying an applied coupon. */
export function bookingHref(offerId: string, couponCode?: string): string {
  const params = new URLSearchParams({ offer: offerId });
  if (couponCode) params.set("coupon", couponCode);
  return `/flights/book?${params.toString()}`;
}

/** Detail page for one offer. */
export function offerHref(offerId: string): string {
  return `/flights/${encodeURIComponent(offerId)}`;
}

/** Confirmation page for a completed booking. */
export function flightBookingHref(bookingId: string): string {
  return `/account/flights/${bookingId}`;
}
