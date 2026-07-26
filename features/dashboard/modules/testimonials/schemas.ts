import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { TESTIMONIAL_STATUS_VALUES } from "./types";

/** Testimonial form schema — serves both create and edit. */
export const testimonialSchema = z.object({
  author: requiredString,
  role: requiredString,
  location: z.string().trim().optional().default(""),
  quote: requiredString.pipe(z.string().max(400, "Keep under 400 characters")),
  rating: z.coerce.number().int().min(1, "Min 1 star").max(5, "Max 5 stars"),
  status: z.enum(TESTIMONIAL_STATUS_VALUES),
});

export type TestimonialFormValues = z.infer<typeof testimonialSchema>;
