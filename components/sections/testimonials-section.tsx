"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { Testimonial } from "@/types/content";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_SECTIONS } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "excellent" | "great";

const FILTERS: { key: FilterKey; label: string; min: number }[] = [
  { key: "all", label: "All reviews", min: 0 },
  { key: "excellent", label: "Excellent", min: 5 },
  { key: "great", label: "Great & up", min: 4 },
];

/**
 * TestimonialsSection — customer quotes with a client-side rating filter. Data
 * arrives as serializable props from the server page; only the filter chips need
 * interactivity. Keying cards by id keeps surviving cards mounted across filter
 * changes so the layout stays calm.
 */
export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const [active, setActive] = useState<FilterKey>("all");

  const min = FILTERS.find((f) => f.key === active)?.min ?? 0;
  const filtered = useMemo(
    () => testimonials.filter((t) => t.rating >= min),
    [testimonials, min],
  );

  if (testimonials.length === 0) return null;

  return (
    <Section background="muted">
      <SectionHeader
        {...HOME_SECTIONS.testimonials}
        align="center"
        action={
          <div
            role="group"
            aria-label="Filter reviews by rating"
            className="flex flex-wrap justify-center gap-2"
          >
            {FILTERS.map((filter) => {
              const selected = filter.key === active;
              return (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActive(filter.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-surface text-body hover:border-primary hover:text-primary",
                  )}
                >
                  {filter.min > 0 && <Star className="size-3.5 fill-current" aria-hidden="true" />}
                  {filter.label}
                </button>
              );
            })}
          </div>
        }
      />

      {filtered.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((testimonial, index) => (
            <Reveal key={testimonial.id} step={index % 3} className="h-full">
              <TestimonialCard testimonial={testimonial} className="h-full" />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-body">No reviews match this rating yet.</p>
      )}
    </Section>
  );
}
