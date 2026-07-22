"use client";

import type { Price } from "@/types/booking";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

export type PriceTagSize = "sm" | "md" | "lg";

const sizeMap: Record<PriceTagSize, { amount: string; meta: string }> = {
  sm: { amount: "text-base", meta: "text-xs" },
  md: { amount: "text-xl", meta: "text-sm" },
  lg: { amount: "text-2xl", meta: "text-sm" },
};

interface PriceTagProps {
  price: Price;
  size?: PriceTagSize;
  /** Show the discount as a "-NN%" badge when an original price is present. */
  showDiscount?: boolean;
  /** Prefix the amount with "From" (used on cards with a price range). */
  from?: boolean;
  className?: string;
}

/**
 * PriceTag — renders a {@link Price}: the current amount in accent, an optional
 * struck-through original, the unit note, and an optional discount badge. The
 * single source of price formatting on cards and details.
 *
 * Amounts are stored in base USD; the active currency (from
 * {@link useLocale}) converts + formats them, so switching currency reprices
 * the whole site instantly.
 */
export function PriceTag({
  price,
  size = "md",
  showDiscount = false,
  from = false,
  className,
}: PriceTagProps) {
  const { money } = useLocale();
  const { amount, original, unit } = price;
  const discount =
    original && original > amount
      ? Math.round(((original - amount) / original) * 100)
      : 0;
  const s = sizeMap[size];

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {from && <span className={cn("text-muted", s.meta)}>From</span>}
      <span className={cn("font-bold text-accent-600", s.amount)}>
        {money(amount)}
      </span>
      {original && original > amount && (
        <span className={cn("text-muted line-through", s.meta)}>
          {money(original)}
        </span>
      )}
      {unit && <span className={cn("text-muted", s.meta)}>{unit}</span>}
      {showDiscount && discount > 0 && (
        <span
          className={cn(
            "rounded-pill bg-danger/10 px-2 py-0.5 font-semibold text-danger",
            s.meta,
          )}
        >
          -{discount}%
        </span>
      )}
    </span>
  );
}
