import { Star } from "lucide-react";
import type { Hotel } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** HotelCard — star class as lead badge, headline amenities as meta. */
export function HotelCard({ hotel, className }: { hotel: Hotel; className?: string }) {
  return (
    <ListingCard
      listing={hotel}
      href={`${VERTICALS.hotels.href}/${hotel.slug}`}
      leadBadge={`${hotel.stars}-Star`}
      meta={[
        { icon: Star, label: `${hotel.stars}.0 hotel class` },
        ...hotel.amenities.slice(0, 2).map((label) => ({ label })),
      ]}
      className={className}
    />
  );
}
