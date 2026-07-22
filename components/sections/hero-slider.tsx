"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { HERO_RATING, HERO_SLIDES } from "@/constants/hero";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const ROTATE_MS = 6500;

interface HeroSliderProps {
  /** Foreground content rendered beneath the headline (e.g. the search bar). */
  children?: ReactNode;
}

/**
 * HeroSlider — the full-bleed animated hero. Background images cross-fade with a
 * slow Ken-Burns zoom; the headline block fades/slides between slides. Auto-
 * rotates, pauses for reduced-motion users, and exposes manual slide dots.
 * Foreground `children` (the search widget) sit in normal flow below the copy.
 */
export function HeroSlider({ children }: HeroSliderProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = HERO_SLIDES.length;
  const slide = HERO_SLIDES[index];

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [count, reduce, index]);

  return (
    <section className="relative isolate z-20 flex min-h-[620px] flex-col bg-dark lg:min-h-[720px]">
      {/* Background layer — overflow-hidden here (not on the section) keeps the
          Ken-Burns zoom clipped to the hero while letting foreground popovers
          (the search dropdowns) escape the section's bottom edge. */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <AnimatePresence>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1 }}
            className="absolute inset-0"
          >
            <div className={cn("relative size-full", !reduce && "animate-ken-burns")}>
              <Image
                src={slide.image}
                alt={slide.imageAlt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </motion.div>
        </AnimatePresence>
        {/* Legibility gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/45 to-ink/30" />
      </div>

      <Container className="relative flex flex-1 flex-col justify-center py-16 lg:py-20">
        {/* Rating badge */}
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-pill bg-surface/15 px-4 py-2 text-sm text-white backdrop-blur">
          <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
          <span className="font-semibold">{HERO_RATING.score}</span>
          <span className="text-white/80">
            from {HERO_RATING.count} {HERO_RATING.source}
          </span>
        </div>

        {/* Headline (per slide) */}
        <div className="max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: reduce ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -16 }}
              transition={{ duration: reduce ? 0 : 0.5 }}
            >
              <p className="text-overline text-accent">{slide.eyebrow}</p>
              <h1 className="text-display mt-3 text-white">
                {slide.title}{" "}
                <span className="text-accent">{slide.highlight}</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/85">
                {slide.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Foreground content (search) */}
        {children && <div className="mt-10 max-w-4xl">{children}</div>}

        {/* Slide dots */}
        <div className="mt-10 flex items-center gap-2">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-2 rounded-pill transition-all duration-300",
                i === index
                  ? "w-8 bg-accent"
                  : "w-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
