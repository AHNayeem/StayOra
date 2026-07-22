import { CalendarClock, DoorOpen, Timer } from "lucide-react";
import type { Visa } from "@/types/catalog";
import type { CardMetaItem } from "@/components/ui/card";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** VisaCard — processing time, validity and entry type. */
export function VisaCard({ visa, className }: { visa: Visa; className?: string }) {
  const meta: CardMetaItem[] = [
    { icon: Timer, label: visa.processingTime },
    { icon: CalendarClock, label: `Valid ${visa.validity}` },
  ];
  if (visa.entryType) meta.push({ icon: DoorOpen, label: visa.entryType });

  return (
    <ListingCard
      listing={visa}
      href={`${VERTICALS.visa.href}/${visa.slug}`}
      priceFrom
      wishlist={false}
      meta={meta}
      className={className}
    />
  );
}
