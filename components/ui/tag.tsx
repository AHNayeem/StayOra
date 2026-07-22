import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagVariant = "soft" | "solid" | "outline";

const variantMap: Record<TagVariant, string> = {
  soft: "bg-surface-muted text-body",
  solid: "bg-primary text-white",
  outline: "border border-line text-body",
};

interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  /** Leading icon (e.g. an amenity glyph). */
  icon?: ReactNode;
  /** When provided, renders a remove (×) button — makes this a filter chip. */
  onRemove?: () => void;
  className?: string;
}

/**
 * Tag — a keyword/amenity chip, optionally removable. Use for facets, applied
 * filters and feature lists. For static status labels use {@link Badge}.
 */
export function Tag({
  children,
  variant = "soft",
  icon,
  onRemove,
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-field px-3 py-1.5 text-xs font-medium",
        variantMap[variant],
        className,
      )}
    >
      {icon}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="-mr-1 grid size-4 place-items-center rounded-full text-current/70 transition-colors hover:bg-black/10 hover:text-current"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
