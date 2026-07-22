import type { CSSProperties } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { star: "size-3.5", text: "text-xs" },
  md: { star: "size-4", text: "text-sm" },
  lg: { star: "size-5", text: "text-base" },
} as const;

interface RatingStarsProps {
  /** Rating on a 0–`max` scale. Renders partial fill (e.g. 4.3). */
  value: number;
  max?: number;
  size?: keyof typeof sizeMap;
  /** Show the numeric value next to the stars. */
  showValue?: boolean;
  /** Show a "(n)" review count after the value. */
  reviewCount?: number;
  className?: string;
}

/**
 * RatingStars — a read-only star rating with fractional fill, implemented by
 * clipping a filled row over an empty row (no icon swapping, so half/quarter
 * stars render precisely). Announces the value to assistive tech.
 */
export function RatingStars({
  value,
  max = 5,
  size = "md",
  showValue = false,
  reviewCount,
  className,
}: RatingStarsProps) {
  const { star, text } = sizeMap[size];
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  const stars = Array.from({ length: max });

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="img"
      aria-label={`Rated ${value} out of ${max}`}
    >
      <span className="relative inline-flex" aria-hidden="true">
        <span className="flex text-line">
          {stars.map((_, i) => (
            <Star key={i} className={star} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex w-(--rs-fill) overflow-hidden"
          style={{ "--rs-fill": `${pct}%` } as CSSProperties}
        >
          {stars.map((_, i) => (
            <Star key={i} className={cn(star, "shrink-0 fill-accent text-accent")} />
          ))}
        </span>
      </span>
      {showValue && (
        <span className={cn("font-semibold text-ink", text)}>
          {value.toFixed(1)}
        </span>
      )}
      {reviewCount !== undefined && (
        <span className={cn("text-muted", text)}>({reviewCount})</span>
      )}
    </span>
  );
}
