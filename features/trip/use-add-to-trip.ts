"use client";

import { useCallback, useState } from "react";
import type { Listing } from "@/types/catalog";
import type { FlightOffer } from "@/types/flight";
import type { ComboSuggestion, TripContext, TripItem } from "@/types/trip";
import { travelerCount } from "@/types/trip";
import { BOOKING_CONFIG } from "@/constants/detail";
import { getListingBySlug } from "@/services/catalog";
import {
  buildComboItems,
  buildFlightItem,
  buildListingItem,
} from "@/services/trip.service";
import { defaultQuantities, type BookingSelection } from "@/lib/booking-pricing";
import { toISODate } from "@/lib/date";
import { toast } from "@/lib/toast";
import { addTripItem, addTripItems, getTripCart, setTripCombo } from "./trip-store";
import { seedContextFromListing, seedContextFromOffer } from "./context";

/**
 * Adding things to the trip.
 *
 * Every "Add to trip" button in the app goes through here, so a product added
 * from a recommendation card, a listing page or a flight result is shaped and
 * priced identically. The selection a product is added with is *derived from
 * the trip context* — a hotel added after a Dhaka → Dubai flight arrives with
 * that flight's dates and party already filled in, which is the whole point of
 * the unified flow.
 */

/** Dates the trip context implies for a product, respecting its date mode. */
function selectionFor(
  listing: Listing,
  context: TripContext,
  nowMs: number,
): BookingSelection {
  const config = BOOKING_CONFIG[listing.vertical];
  const quantities = defaultQuantities(config);

  // Size the party fields from the context rather than leaving vertical defaults.
  const people = Math.max(1, travelerCount(context.travelers));
  for (const field of config.fields) {
    if (field.multiplier) continue;
    quantities[field.key] = Math.min(field.max, Math.max(field.min, people));
  }

  const today = toISODate(new Date(nowMs));
  const start = context.departureDate || today;
  // A stay needs an end date; fall back to a single night so the item is
  // priceable the moment it's added, and the traveller can adjust in the cart.
  const end =
    context.returnDate && context.returnDate > start
      ? context.returnDate
      : toISODate(new Date(new Date(start).getTime() + 86_400_000));

  if (config.dateMode === "range") {
    return { checkIn: start, checkOut: end, singleDate: "", quantities };
  }
  if (config.dateMode === "single") {
    return { checkIn: "", checkOut: "", singleDate: start, quantities };
  }
  return { checkIn: "", checkOut: "", singleDate: start, quantities };
}

export interface AddToTripResult {
  /** Add a catalog product by vertical + slug (recommendation cards). */
  addBySlug: (vertical: Listing["vertical"], slug: string) => Promise<TripItem | undefined>;
  /** Add a listing you already hold, with the traveller's own selection. */
  addListing: (listing: Listing, selection?: BookingSelection) => TripItem;
  /** Add a selected flight offer — this also seeds the whole trip context. */
  addOffer: (offer: FlightOffer) => TripItem;
  /** Apply a bundle: its components become trip items, keeping their merchants. */
  applyCombo: (suggestion: ComboSuggestion) => TripItem[];
  /** True while a slug is being resolved. */
  pendingSlug: string | null;
}

export function useAddToTrip(): AddToTripResult {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const addListing = useCallback((listing: Listing, selection?: BookingSelection) => {
    const nowMs = Date.now();
    const cart = getTripCart();
    const resolved = selection ?? selectionFor(listing, cart.context, nowMs);
    const item = buildListingItem({
      listing,
      selection: resolved,
      travelers: Math.max(1, travelerCount(cart.context.travelers)),
      addedAt: new Date(nowMs).toISOString(),
    });

    seedContextFromListing(listing, {
      checkIn: resolved.checkIn || resolved.singleDate,
      checkOut: resolved.checkOut || undefined,
      current: cart.context,
      nowIso: new Date(nowMs).toISOString(),
    });
    addTripItem(item);
    return item;
  }, []);

  const addBySlug = useCallback(
    async (vertical: Listing["vertical"], slug: string) => {
      setPendingSlug(slug);
      try {
        const listing = await getListingBySlug(vertical, slug);
        if (!listing) {
          toast.error("That product is no longer available.");
          return undefined;
        }
        return addListing(listing);
      } finally {
        setPendingSlug(null);
      }
    },
    [addListing],
  );

  const addOffer = useCallback((offer: FlightOffer) => {
    const nowIso = new Date().toISOString();
    // The flight is what teaches the trip where and when it's going.
    seedContextFromOffer(offer, nowIso);
    const item = buildFlightItem(offer, nowIso);
    addTripItem(item);
    return item;
  }, []);

  const applyCombo = useCallback((suggestion: ComboSuggestion) => {
    const cart = getTripCart();
    const items = buildComboItems(suggestion, cart.context, new Date().toISOString());
    addTripItems(items);
    setTripCombo({ id: suggestion.comboId, name: suggestion.name });
    return items;
  }, []);

  return { addBySlug, addListing, addOffer, applyCombo, pendingSlug };
}
