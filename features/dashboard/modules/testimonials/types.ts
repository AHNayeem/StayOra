import type { StatusDef } from "../../lib/status";

export const TESTIMONIAL_STATUS_VALUES = ["published", "pending", "hidden"] as const;
export type TestimonialStatus = (typeof TESTIMONIAL_STATUS_VALUES)[number];

export interface Testimonial {
  id: string;
  author: string;
  /** Traveller type / role, e.g. "Family traveller". */
  role: string;
  location: string;
  quote: string;
  /** 1–5 star rating. */
  rating: number;
  status: TestimonialStatus;
  updatedAt: string;
}

export interface TestimonialSummary {
  total: number;
  published: number;
  pending: number;
  /** Mean rating across all testimonials, 0–5. */
  averageRating: number;
}

export const TESTIMONIAL_STATUSES: readonly StatusDef<TestimonialStatus>[] = [
  { value: "published", label: "Published", tone: "success" },
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "hidden", label: "Hidden", tone: "neutral" },
];
