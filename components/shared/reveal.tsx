"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Stagger presets → transition-delay utilities, so grid items cascade in. */
const STAGGER = ["", "delay-75", "delay-150", "delay-200", "delay-300"] as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** 0-based stagger step; clamped to the preset scale. */
  step?: number;
  /** Reveal every time it enters view (default reveals once). */
  repeat?: boolean;
}

/**
 * Reveal — fades + lifts its children into view on scroll via IntersectionObserver.
 * The only motion island for the home page's scroll-reveal; hover/zoom stays pure
 * CSS on the cards. Honors `prefers-reduced-motion` (transition is neutralized
 * globally, so content still appears once observed).
 */
export function Reveal({ children, className, step = 0, repeat = false }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (!repeat) observer.unobserve(entry.target);
          } else if (repeat) {
            setVisible(false);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [repeat]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-slow ease-out-soft motion-reduce:transition-none",
        STAGGER[Math.min(step, STAGGER.length - 1)],
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
