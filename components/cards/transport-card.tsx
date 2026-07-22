import { Car, Clock, Route, Users } from "lucide-react";
import type { Transport } from "@/types/catalog";
import type { CardMetaItem } from "@/components/ui/card";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** TransportCard — vehicle type, seats, route and duration. */
export function TransportCard({
  transport,
  className,
}: {
  transport: Transport;
  className?: string;
}) {
  const meta: CardMetaItem[] = [
    { icon: Car, label: transport.transportType },
    { icon: Users, label: `${transport.seats} seats` },
  ];
  if (transport.durationHours)
    meta.push({ icon: Clock, label: `${transport.durationHours}h` });
  if (transport.route)
    meta.push({ icon: Route, label: `${transport.route.from} → ${transport.route.to}` });

  return (
    <ListingCard
      listing={transport}
      href={`${VERTICALS.transport.href}/${transport.slug}`}
      meta={meta}
      className={className}
    />
  );
}
