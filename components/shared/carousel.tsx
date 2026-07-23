"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CarouselProps {
  /** Slides — each is wrapped in a snap-aligned, fixed-width `<li>`. */
  children: ReactNode[];
  /** Accessible name for the scrollable region. */
  ariaLabel: string;
  /** Width utilities applied to every slide (e.g. "w-[300px] sm:w-[340px]"). */
  itemClassName?: string;
  /** Title/description block shown top-left (typically a `SectionHeader`). */
  header?: ReactNode;
  /** Optional trailing "view all" link rendered beside the controls. */
  viewAll?: { href: string; label: string };
  className?: string;
}

/** Scroll state derived from the track's geometry. */
interface ScrollState {
  prev: boolean;
  next: boolean;
}

/**
 * Carousel — a horizontally scrollable, snap-aligned rail with previous/next
 * controls and an optional header + "view all" link. Native scroll drives it
 * (swipe on touch, wheel on trackpad, arrows on desktop), so it stays smooth and
 * accessible with almost no JS. Arrow enabled-state is recomputed from the
 * track's geometry inside scroll/resize callbacks (never synchronously in the
 * effect body) to satisfy the set-state-in-effect rule. Respects reduced motion
 * via the global CSS reset on `scroll-behavior`.
 */
export function Carousel({
  children,
  ariaLabel,
  itemClassName = "w-[280px] sm:w-[320px]",
  header,
  viewAll,
  className,
}: CarouselProps) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [{ prev, next }, setScroll] = useState<ScrollState>({
    prev: false,
    next: true,
  });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setScroll({
        prev: scrollLeft > 4,
        next: scrollLeft + clientWidth < scrollWidth - 4,
      });
    };

    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const controls = (
    <div className="flex shrink-0 items-center gap-2">
      {viewAll && (
        <Link
          href={viewAll.href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          {viewAll.label}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
      <div className="hidden items-center gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          disabled={!prev}
          aria-label="Scroll to previous items"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "size-10 rounded-full",
          )}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          disabled={!next}
          aria-label="Scroll to next items"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "size-10 rounded-full",
          )}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {(header || viewAll) && (
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">{header}</div>
          {controls}
        </div>
      )}

      <ul
        ref={trackRef}
        aria-label={ariaLabel}
        className={cn(
          "-mx-4 mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-3",
          // Hide the native scrollbar; the arrow controls + swipe drive it.
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children.map((child, index) => (
          <li key={index} className={cn("snap-start shrink-0", itemClassName)}>
            {child}
          </li>
        ))}
      </ul>
    </div>
  );
}
