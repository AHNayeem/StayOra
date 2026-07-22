import Image from "next/image";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<AvatarSize, { box: string; text: string; px: number }> = {
  xs: { box: "size-7", text: "text-[0.625rem]", px: 28 },
  sm: { box: "size-9", text: "text-xs", px: 36 },
  md: { box: "size-11", text: "text-sm", px: 44 },
  lg: { box: "size-14", text: "text-base", px: 56 },
  xl: { box: "size-20", text: "text-xl", px: 80 },
};

interface AvatarProps {
  /** Image URL. When absent, initials from `name` are shown. */
  src?: string;
  /** Full name — used for the alt text and initials fallback. */
  name: string;
  size?: AvatarSize;
  /** Add a subtle ring (e.g. for stacked/overlapping avatars). */
  ring?: boolean;
  className?: string;
}

/** Derive up to two uppercase initials from a name. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar — a circular user image with an initials fallback when no `src` is
 * given. Used in reviews, testimonials and account chrome.
 */
export function Avatar({ src, name, size = "md", ring, className }: AvatarProps) {
  const { box, text, px } = sizeMap[size];

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-50 font-semibold text-primary-700 select-none",
        box,
        ring && "ring-2 ring-surface",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="size-full object-cover"
        />
      ) : (
        <span className={text} aria-label={name}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
