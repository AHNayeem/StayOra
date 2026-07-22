import { Star, Utensils } from "lucide-react";
import type { Resort } from "@/types/catalog";
import type { CardMetaItem } from "@/components/ui/card";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** ResortCard — star class + board type and a headline amenity. */
export function ResortCard({ resort, className }: { resort: Resort; className?: string }) {
  const meta: CardMetaItem[] = [{ icon: Star, label: `${resort.stars}.0 resort class` }];
  if (resort.boardType) meta.push({ icon: Utensils, label: resort.boardType });
  if (resort.amenities[0]) meta.push({ label: resort.amenities[0] });

  return (
    <ListingCard
      listing={resort}
      href={`${VERTICALS.resorts.href}/${resort.slug}`}
      leadBadge={`${resort.stars}-Star`}
      meta={meta}
      className={className}
    />
  );
}
