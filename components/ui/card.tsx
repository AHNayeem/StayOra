import Image from "next/image";
import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card system — a small set of composable, presentational parts shared by every
 * card variant (listing + content). Nothing here is vertical-specific: variants
 * assemble these pieces and supply the data slots. Server-safe (no state).
 */

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Adds hover elevation + enables `group` so media can zoom on hover. */
  interactive?: boolean;
}

/** Card — the outer surface (border, radius, shadow). */
export function Card({ children, className, as, interactive = true }: CardProps) {
  const Component = as ?? "article";
  return (
    <Component
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition duration-base ease-out-soft",
        interactive && "hover:-translate-y-1 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </Component>
  );
}

const aspectMap = {
  card: "aspect-[4/3]",
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  wide: "aspect-[16/10]",
} as const;

interface CardMediaProps {
  src: string;
  alt: string;
  /** If set, the image becomes a link (with a full-card stretched overlay). */
  href?: string;
  aspect?: keyof typeof aspectMap;
  sizes?: string;
  /** Disable the hover zoom (e.g. for logos). */
  zoom?: boolean;
  /** Add a bottom-up legibility gradient (for overlaid text). */
  gradient?: boolean;
  /** Top-left overlay (badges). */
  badges?: ReactNode;
  /** Top-right overlay (wishlist / actions). */
  actions?: ReactNode;
  /** Bottom overlay (price/label chips over the image). */
  overlay?: ReactNode;
  className?: string;
}

/**
 * CardMedia — the image area with hover-zoom and overlay slots. When `href` is
 * given it renders a stretched link so the whole card is clickable while inner
 * actions (wishlist) stay independently interactive.
 */
export function CardMedia({
  src,
  alt,
  href,
  aspect = "card",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  zoom = true,
  gradient = false,
  badges,
  actions,
  overlay,
  className,
}: CardMediaProps) {
  return (
    <div className={cn("relative overflow-hidden", aspectMap[aspect], className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={cn(
          "object-cover transition-transform duration-slow ease-out-soft",
          zoom && "group-hover:scale-105",
        )}
      />
      {gradient && (
        <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/10 to-transparent" />
      )}
      {href && (
        <Link
          href={href}
          aria-label={alt}
          className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
      )}
      {badges && (
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">{badges}</div>
      )}
      {actions && <div className="absolute top-3 right-3 z-20 flex gap-2">{actions}</div>}
      {overlay && <div className="absolute inset-x-3 bottom-3 z-20">{overlay}</div>}
    </div>
  );
}

/** CardBody — padded content area; grows to align footers in a grid row. */
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-1 flex-col gap-2 p-4", className)}>{children}</div>;
}

interface CardTitleProps {
  children: ReactNode;
  /** Makes the title a link (stretched over the card). */
  href?: string;
  as?: ElementType;
  className?: string;
}

/** CardTitle — clamped heading; links stretch over the whole card. */
export function CardTitle({ children, href, as, className }: CardTitleProps) {
  const Component = as ?? "h3";
  const base = cn("line-clamp-2 text-base font-semibold text-ink", className);
  if (href) {
    return (
      <Component className={base}>
        <Link
          href={href}
          className="rounded-sm transition-colors before:absolute before:inset-0 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {children}
        </Link>
      </Component>
    );
  }
  return <Component className={base}>{children}</Component>;
}

/** CardFooter — bottom row (price + CTA), separated by a hairline. */
export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mt-auto flex items-center justify-between gap-3 border-t border-line p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface CardMetaItem {
  icon?: LucideIcon;
  label: string;
}

/** CardMetaList — a wrapping row of icon+label meta (beds, duration, seats…). */
export function CardMetaList({
  items,
  className,
}: {
  items: CardMetaItem[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm text-body", className)}>
      {items.map(({ icon: ItemIcon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          {ItemIcon && <ItemIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
