/** Testimonials module — customer quotes (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { testimonialSchema } from "./schemas";
export type { TestimonialFormValues } from "./schemas";
export { testimonialsService, testimonialKeys, getTestimonialSummary } from "./service";
export { testimonialColumns } from "./columns";
export {
  useTestimonials,
  useTestimonialSummary,
  useCreateTestimonial,
  useUpdateTestimonial,
  useSetTestimonialStatus,
  useDeleteTestimonial,
} from "./hooks";
export { TestimonialForm } from "./form";
export { TestimonialList } from "./list";
