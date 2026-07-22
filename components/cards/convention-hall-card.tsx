import { LayoutGrid, Maximize, Users } from "lucide-react";
import type { ConventionHall } from "@/types/catalog";
import type { CardMetaItem } from "@/components/ui/card";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** ConventionHallCard — capacity, area and supported layouts. */
export function ConventionHallCard({
  hall,
  className,
}: {
  hall: ConventionHall;
  className?: string;
}) {
  const meta: CardMetaItem[] = [
    { icon: Users, label: `Up to ${hall.capacity.toLocaleString()} guests` },
  ];
  if (hall.areaSqm) meta.push({ icon: Maximize, label: `${hall.areaSqm.toLocaleString()} m²` });
  if (hall.layouts?.length)
    meta.push({ icon: LayoutGrid, label: `${hall.layouts.length} layouts` });

  return (
    <ListingCard
      listing={hall}
      href={`${VERTICALS["convention-hall"].href}/${hall.slug}`}
      priceFrom
      meta={meta}
      className={className}
    />
  );
}
