import {
  Award,
  Gauge,
  Leaf,
  Sparkles,
  Tag,
  TrendingDown,
} from "lucide-react";
import type { FlightBadge } from "@/types/flight";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

/** Presentation for each comparative badge the generator can assign. */
const BADGE_META: Record<
  FlightBadge,
  { label: string; variant: BadgeVariant; icon: typeof Award }
> = {
  recommended: { label: "Recommended", variant: "primary", icon: Sparkles },
  cheapest: { label: "Cheapest", variant: "success", icon: TrendingDown },
  fastest: { label: "Fastest", variant: "accent", icon: Gauge },
  "best-value": { label: "Best value", variant: "primary", icon: Award },
  promo: { label: "Promo", variant: "danger", icon: Tag },
};

/**
 * FlightBadges — the comparative labels on a result card.
 *
 * Capped at three: past that they stop signalling and start decorating, and a
 * card wearing five badges tells you nothing about which offer to pick.
 */
export function FlightBadges({
  badges,
  promoLabel,
  max = 3,
}: {
  badges: FlightBadge[];
  promoLabel?: string;
  max?: number;
}) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.slice(0, max).map((badge) => {
        const meta = BADGE_META[badge];
        const Icon = meta.icon;
        return (
          <Badge
            key={badge}
            variant={meta.variant}
            size="sm"
            icon={<Icon className="size-3" aria-hidden="true" />}
          >
            {badge === "promo" && promoLabel ? promoLabel : meta.label}
          </Badge>
        );
      })}
    </div>
  );
}

/**
 * Emissions chip. Only shown when an offer is meaningfully greener or dirtier
 * than the route average — a "+2% CO₂" badge on every card is noise, and the
 * comparison only helps when there's a real choice to make.
 */
export function EmissionsBadge({
  co2Kg,
  vsAveragePct,
}: {
  co2Kg: number;
  vsAveragePct: number;
}) {
  if (Math.abs(vsAveragePct) < 8) return null;
  const greener = vsAveragePct < 0;

  return (
    <span
      className={
        greener
          ? "inline-flex items-center gap-1 rounded-pill bg-primary-50 px-2 py-0.5 text-[0.6875rem] font-medium text-primary-700"
          : "inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted"
      }
      title={`${co2Kg} kg CO₂ per traveller — ${Math.abs(vsAveragePct)}% ${greener ? "below" : "above"} the average for this route`}
    >
      <Leaf className="size-3" aria-hidden="true" />
      {Math.abs(vsAveragePct)}% {greener ? "less" : "more"} CO₂
    </span>
  );
}
