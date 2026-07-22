import { BedDouble, Users } from "lucide-react";
import type { SharedRoom } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** RoomCard — shared / dorm room sold per bed. */
export function RoomCard({ room, className }: { room: SharedRoom; className?: string }) {
  return (
    <ListingCard
      listing={room}
      href={`${VERTICALS["shared-rooms"].href}/${room.slug}`}
      priceFrom
      meta={[
        { icon: BedDouble, label: room.roomType },
        { icon: Users, label: `${room.bedsAvailable} beds free` },
      ]}
      className={className}
    />
  );
}
