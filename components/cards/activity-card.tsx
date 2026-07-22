import { Clock, Tag } from "lucide-react";
import type { Activity } from "@/types/catalog";
import { VERTICALS } from "@/constants/verticals";
import { ListingCard } from "./listing-card";

/** ActivityCard — single-session experience: duration + category. */
export function ActivityCard({
  activity,
  className,
}: {
  activity: Activity;
  className?: string;
}) {
  return (
    <ListingCard
      listing={activity}
      href={`${VERTICALS.activities.href}/${activity.slug}`}
      meta={[
        { icon: Clock, label: `${activity.durationHours}h` },
        { icon: Tag, label: activity.category },
      ]}
      className={className}
    />
  );
}
