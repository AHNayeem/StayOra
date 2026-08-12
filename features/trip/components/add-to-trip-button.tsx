"use client";

import { useState } from "react";
import { Check, Loader2, Luggage } from "lucide-react";
import type { Listing } from "@/types/catalog";
import type { FlightOffer } from "@/types/flight";
import type { BookingSelection } from "@/lib/booking-pricing";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { useAddToTrip } from "../use-add-to-trip";
import { useTripCart } from "../trip-store";

interface BaseProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
  label?: string;
}

/**
 * AddToTripButton — put a listing into the unified trip without leaving the page.
 *
 * Sits *beside* the existing "Book now" CTA, never in place of it: booking one
 * product on its own has to stay the shortest path, and a trip is opt-in.
 */
export function AddToTripButton({
  listing,
  selection,
  variant = "outline",
  fullWidth,
  className,
  label = "Add to trip",
}: BaseProps & { listing: Listing; selection?: BookingSelection }) {
  const { addListing } = useAddToTrip();
  const cart = useTripCart();
  const [busy, setBusy] = useState(false);

  const inTrip = cart.items.some(
    (i) => i.ref.source === "catalog" && i.ref.listingId === listing.id,
  );

  const onClick = () => {
    setBusy(true);
    try {
      const item = addListing(listing, selection);
      toast.success(`${listing.title} added to your trip`, {
        description: `${item.detail} · Continue building your trip or check out.`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={inTrip ? "ghost" : variant}
      size="md"
      fullWidth={fullWidth}
      className={className}
      onClick={onClick}
      disabled={busy || inTrip}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : inTrip ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Luggage className="size-4" aria-hidden="true" />
      )}
      {inTrip ? "In your trip" : label}
    </Button>
  );
}

/**
 * AddFlightToTripButton — the most important entry point in the whole feature.
 *
 * Adding the flight is what establishes the trip context (destination, dates,
 * travellers, cabin), which is what every downstream recommendation reads.
 */
export function AddFlightToTripButton({
  offer,
  variant = "outline",
  fullWidth,
  className,
  label = "Add to trip & keep planning",
}: BaseProps & { offer: FlightOffer }) {
  const { addOffer } = useAddToTrip();
  const cart = useTripCart();
  const [busy, setBusy] = useState(false);

  const inTrip = cart.items.some(
    (i) => i.ref.source === "flight" && i.ref.offerId === offer.id,
  );

  const onClick = () => {
    setBusy(true);
    try {
      const item = addOffer(offer);
      toast.success("Flight added to your trip", {
        description: `We'll suggest hotels, transfers and things to do in ${item.destination}.`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={inTrip ? "ghost" : variant}
      size="md"
      fullWidth={fullWidth}
      className={className}
      onClick={onClick}
      disabled={busy || inTrip}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : inTrip ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Luggage className="size-4" aria-hidden="true" />
      )}
      {inTrip ? "In your trip" : label}
    </Button>
  );
}
