"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Target value counted up to. */
  value: number;
  /** Animation length in ms. Default 1600. */
  duration?: number;
  /** Fixed decimal places. Defaults to 0 for integers, 1 otherwise. */
  decimals?: number;
  /** Trailing unit (e.g. "M+", "/5"). */
  suffix?: string;
  className?: string;
  suffixClassName?: string;
}

/** easeOutCubic — fast start, gentle settle. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * CountUp — animates 0 → value once scrolled into view, then holds. The animated
 * counterpart to the static {@link "@/components/cards/stat-card".StatCard};
 * used by the home "Fun Facts" band. Respects `prefers-reduced-motion` by
 * jumping straight to the final value.
 */
export function CountUp({
  value,
  duration = 1600,
  decimals,
  suffix,
  className,
  suffixClassName,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const places = decimals ?? (Number.isInteger(value) ? 0 : 1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let startedAt = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();

        if (reduce) {
          setDisplay(value);
          return;
        }

        const tick = (now: number) => {
          if (!startedAt) startedAt = now;
          const progress = Math.min((now - startedAt) / duration, 1);
          setDisplay(value * ease(progress));
          if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });

  return (
    <span ref={ref} className={className}>
      {formatted}
      {suffix && <span className={suffixClassName}>{suffix}</span>}
    </span>
  );
}
