import { Bath, BedDouble, Maximize, Users } from "lucide-react";
import type { Apartment } from "@/types/catalog";
import type { CardMetaItem } from "@/components/ui/card";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** ApartmentCard — beds/baths/guests + optional floor area. */
export function ApartmentCard({
  apartment,
  className,
}: {
  apartment: Apartment;
  className?: string;
}) {
  const meta: CardMetaItem[] = [
    { icon: BedDouble, label: `${apartment.bedrooms} bed${apartment.bedrooms > 1 ? "s" : ""}` },
    { icon: Bath, label: `${apartment.bathrooms} bath${apartment.bathrooms > 1 ? "s" : ""}` },
    { icon: Users, label: `${apartment.guests} guests` },
  ];
  if (apartment.sizeSqm) meta.push({ icon: Maximize, label: `${apartment.sizeSqm} m²` });

  return (
    <ListingCard
      listing={apartment}
      href={`${VERTICALS.apartments.href}/${apartment.slug}`}
      meta={meta}
      className={className}
    />
  );
}
