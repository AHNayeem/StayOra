"use client";

import { useMemo } from "react";
import type { Listing } from "@/types/catalog";
import type { TripContext } from "@/types/trip";
import { VERTICALS } from "@/constants/verticals";
import { useTripCart } from "../trip-store";
import { placeForListing } from "../context";
import { AddToTripButton } from "./add-to-trip-button";
import { RecommendationRail } from "./recommendation-rail";

/**
 * The trip surfaces on a listing detail page.
 *
 * A stay (or tour, or activity) anchors a trip just as a flight does — it knows
 * a city, and once the traveller has dates and a party it knows those too. The
 * context used here prefers whatever the trip already holds (so a hotel opened
 * after a flight inherits that flight's dates) and falls back to the listing.
 */
function contextForListing(listing: Listing, current: TripContext): TripContext {
  const place = placeForListing(listing);
  const sameCity =
    current.destination?.city?.toLowerCase() === place.city.toLowerCase();

  return {
    ...current,
    destination: sameCity ? current.destination : place,
    // Dates only carry over when the trip is genuinely the same destination.
    departureDate: sameCity ? current.departureDate : undefined,
    returnDate: sameCity ? current.returnDate : undefined,
    seededBy: listing.vertical,
  };
}

/** "Add to trip" beside the booking widget — never instead of "Book now". */
export function ListingTripCta({ listing }: { listing: Listing }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 text-center shadow-card">
      <p className="text-sm font-semibold text-ink">Booking more than one thing?</p>
      <p className="mt-1 text-xs text-muted">
        Add this to a trip and we&apos;ll suggest what goes with it — then book it
        all in one checkout.
      </p>
      <AddToTripButton listing={listing} fullWidth className="mt-3" />
    </div>
  );
}

/**
 * "Complete your stay" — the contextual rail below a listing's content.
 * Renders nothing when the listing's city has nothing worth suggesting.
 */
export function ListingRecommendations({ listing }: { listing: Listing }) {
  const cart = useTripCart();
  const context = useMemo(
    () => contextForListing(listing, cart.context),
    [listing, cart.context],
  );

  const isStay = ["hotels", "apartments", "resorts", "shared-rooms"].includes(
    listing.vertical,
  );

  return (
    <RecommendationRail
      context={context}
      items={cart.items}
      title={isStay ? "Complete your stay" : `Complete your ${context.destination?.city} trip`}
      subtitle={
        isStay
          ? `Transfers, tours and things to do near ${listing.location.label}`
          : `Goes well with this ${VERTICALS[listing.vertical].label.toLowerCase()}`
      }
      maxGroups={3}
    />
  );
}
