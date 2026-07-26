import { createStubService } from "../../crud";
import { TESTIMONIALS_SEED } from "./data";
import type { Testimonial, TestimonialSummary } from "./types";
import type { TestimonialFormValues } from "./schemas";

/** Testimonials data source (in-memory stub; repository-ready). */
export const testimonialsService = createStubService<Testimonial, TestimonialFormValues>({
  seed: TESTIMONIALS_SEED,
  getId: (row) => row.id,
  searchFields: ["author", "role", "location", "quote"],
  idPrefix: "tst",
  applyCreate: (input, id) => ({
    ...input,
    location: input.location ?? "",
    id,
    updatedAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const testimonialKeys = {
  all: ["cms", "testimonials"] as const,
  summary: ["cms", "testimonials", "summary"] as const,
};

/** Aggregate KPIs — a seam a real backend can serve pre-computed. */
export function getTestimonialSummary(): Promise<TestimonialSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = TESTIMONIALS_SEED;
      const total = rows.length;
      const sum = rows.reduce((acc, r) => acc + r.rating, 0);
      resolve({
        total,
        published: rows.filter((r) => r.status === "published").length,
        pending: rows.filter((r) => r.status === "pending").length,
        averageRating: total ? Math.round((sum / total) * 10) / 10 : 0,
      });
    }, 300);
  });
}
