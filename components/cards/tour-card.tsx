import { CalendarDays, Compass, Users } from "lucide-react";
import type { Tour } from "@/types/catalog";
import type { CardMetaItem } from "@/components/ui/card";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** TourCard — duration, group size and tour type. */
export function TourCard({ tour, className }: { tour: Tour; className?: string }) {
  const meta: CardMetaItem[] = [
    { icon: CalendarDays, label: `${tour.durationDays} days` },
    { icon: Users, label: `Max ${tour.groupSize}` },
  ];
  if (tour.tourType) meta.push({ icon: Compass, label: tour.tourType });

  return (
    <ListingCard
      listing={tour}
      href={`${VERTICALS.tours.href}/${tour.slug}`}
      priceFrom
      meta={meta}
      className={className}
    />
  );
}
