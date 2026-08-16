"use client";

import { useMemo, useState } from "react";
import type { Listing } from "@/types/catalog";
import { merchantForListing, toPropertyRef, useDomainValue } from "@/features/booking";
import {
  getRoomTypes,
  ratePlansFor,
  type PropertyRef,
  type RatePlan,
  type RoomType,
} from "../../domain";
import { useDomainScope } from "../../domain/use-domain";

/** First of the month, `offset` months from the current one, as `YYYY-MM-DD`. */
export function monthStart(offset: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return date.toISOString().slice(0, 10);
}

export function daysInMonth(iso: string): number {
  const [year, month] = iso.split("-").map(Number);
  // Day 0 of the next month is the last day of this one — correct for February
  // in a leap year without a special case.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface PricingScope {
  /** Listings the signed-in principal may price. */
  listings: Listing[];
  listing: Listing | undefined;
  property: PropertyRef | null;
  rooms: RoomType[];
  room: RoomType | undefined;
  plans: RatePlan[];
  plan: RatePlan | undefined;
  /** First of the displayed month, ISO. */
  monthStartIso: string;
  monthDays: number;
  monthOffset: number;
  setListingId: (id: string) => void;
  setRoomId: (id: string) => void;
  setPlanId: (id: string) => void;
  setMonthOffset: (next: number | ((prev: number) => number)) => void;
}

/**
 * The property / room / rate plan / month a pricing screen is looking at.
 *
 * Every pricing surface needs the same four selections and the same row-level
 * rule — a merchant may only price their own properties — so it lives here
 * rather than being re-derived, slightly differently, on each screen.
 */
export function usePricingScope(listings: Listing[]): PricingScope {
  const scope = useDomainScope();

  const visible = useMemo(
    () =>
      scope.merchantId
        ? listings.filter((listing) => merchantForListing(listing).id === scope.merchantId)
        : listings,
    [listings, scope.merchantId],
  );

  const [listingId, setListingId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [planId, setPlanId] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const listing = visible.find((l) => l.id === listingId) ?? visible[0];
  const property = listing ? toPropertyRef(listing) : null;

  const rooms = useDomainValue<RoomType[]>(
    () => (property ? getRoomTypes(property) : []),
    [property?.id],
  );
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];

  const plans = useDomainValue<RatePlan[]>(
    () => (listing ? ratePlansFor(listing.vertical, listing.id) : []),
    [listing?.id, listing?.vertical],
  );
  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  const monthStartIso = monthStart(monthOffset);

  return {
    listings: visible,
    listing,
    property,
    rooms,
    room,
    plans,
    plan,
    monthStartIso,
    monthDays: daysInMonth(monthStartIso),
    monthOffset,
    // Changing the property invalidates the room and plan choices below it.
    setListingId: (id: string) => {
      setListingId(id);
      setRoomId("");
      setPlanId("");
    },
    setRoomId,
    setPlanId,
    setMonthOffset,
  };
}
