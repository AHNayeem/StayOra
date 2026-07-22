import type { Listing } from "@/types/catalog";
import { HotelCard } from "./hotel-card";
import { ApartmentCard } from "./apartment-card";
import { ResortCard } from "./resort-card";
import { RoomCard } from "./room-card";
import { ConventionHallCard } from "./convention-hall-card";
import { TransportCard } from "./transport-card";
import { TourCard } from "./tour-card";
import { ActivityCard } from "./activity-card";
import { VisaCard } from "./visa-card";

/**
 * AutoListingCard — renders the correct per-vertical card for any {@link Listing}.
 * Switches on the discriminated `vertical` literal, so TypeScript narrows each
 * case with no casts. Lets rails and listing grids stay vertical-agnostic —
 * pass a mixed or single-vertical array and each item picks its own card.
 */
export function AutoListingCard({
  listing,
  className,
}: {
  listing: Listing;
  className?: string;
}) {
  switch (listing.vertical) {
    case "hotels":
      return <HotelCard hotel={listing} className={className} />;
    case "apartments":
      return <ApartmentCard apartment={listing} className={className} />;
    case "resorts":
      return <ResortCard resort={listing} className={className} />;
    case "shared-rooms":
      return <RoomCard room={listing} className={className} />;
    case "convention-hall":
      return <ConventionHallCard hall={listing} className={className} />;
    case "transport":
      return <TransportCard transport={listing} className={className} />;
    case "tours":
      return <TourCard tour={listing} className={className} />;
    case "activities":
      return <ActivityCard activity={listing} className={className} />;
    case "visa":
      return <VisaCard visa={listing} className={className} />;
  }
}
