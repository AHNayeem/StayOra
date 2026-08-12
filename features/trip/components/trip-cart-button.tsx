"use client";

import Link from "next/link";
import { Luggage } from "lucide-react";
import { useT } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { useTripCart } from "../trip-store";

/**
 * TripCartButton — the header entry into the unified trip.
 *
 * Hidden entirely until the traveller has actually put something in a trip, so
 * the chrome doesn't grow an empty basket icon for the majority of visitors who
 * book one product. Once there is a trip, the count is the reminder that
 * carries context across modules.
 */
export function TripCartButton({
  className,
  showLabel = false,
}: {
  className?: string;
  /** Show the destination label beside the icon. Off in the header, where the
   *  primary nav already claims the horizontal budget. */
  showLabel?: boolean;
}) {
  const cart = useTripCart();
  const t = useT();
  const count = cart.items.length;

  if (count === 0) return null;

  const city = cart.context.destination?.city;

  return (
    <Link
      href="/trip"
      aria-label={t("Your trip")}
      title={city ? `${city} trip · ${count}` : `Your trip · ${count}`}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-line px-3 text-sm font-medium leading-none text-ink transition-colors hover:border-primary hover:text-primary",
        className,
      )}
    >
      <Luggage className="size-4 shrink-0" aria-hidden="true" />
      {showLabel && (
        <span className="max-w-32 truncate">{city ? `${city} trip` : t("My trip")}</span>
      )}
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[0.6875rem] font-bold text-white">
        {count}
      </span>
    </Link>
  );
}
