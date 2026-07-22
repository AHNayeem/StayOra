import { cn } from "@/lib/utils";

export type SkeletonVariant = "text" | "rect" | "circle";

interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Tailwind sizing/spacing classes (e.g. "h-4 w-24"). */
  className?: string;
}

const variantMap: Record<SkeletonVariant, string> = {
  text: "h-4 rounded-field",
  rect: "rounded-card",
  circle: "rounded-full",
};

/**
 * Skeleton — an animated placeholder shown while content loads. Size it with
 * utility classes; use {@link SkeletonText} for multi-line paragraphs.
 */
export function Skeleton({ variant = "rect", className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-surface-muted",
        variantMap[variant],
        className,
      )}
    />
  );
}

interface SkeletonTextProps {
  /** Number of lines. */
  lines?: number;
  className?: string;
}

/**
 * SkeletonText — a stack of shimmering lines; the last line is shortened to
 * mimic a paragraph's ragged edge.
 */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(i === lines - 1 && lines > 1 && "w-2/3")}
        />
      ))}
    </div>
  );
}
