"use client";

import { type ReactNode } from "react";
import { useQuery, useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { testimonialColumns } from "./columns";
import { testimonialKeys, testimonialsService, getTestimonialSummary } from "./service";
import type { TestimonialFormValues } from "./schemas";
import type { Testimonial } from "./types";

/** List testimonials, optionally with a trailing row-actions column. */
export function useTestimonials(rowActions?: (row: Testimonial) => ReactNode) {
  return useResourceList<Testimonial>({
    queryKey: testimonialKeys.all,
    fetcher: (params, signal) => testimonialsService.list(params, signal),
    columns: testimonialColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "updatedAt", direction: "desc" },
    rowActions,
  });
}

export function useTestimonialSummary() {
  return useQuery({
    queryKey: testimonialKeys.summary,
    queryFn: () => getTestimonialSummary(),
    staleTime: 60_000,
  });
}

export function useCreateTestimonial() {
  return useMutation<Testimonial, TestimonialFormValues>({
    mutationFn: (input) => testimonialsService.create(input),
    invalidateKeys: [testimonialKeys.all, testimonialKeys.summary],
  });
}

export function useUpdateTestimonial() {
  return useMutation<Testimonial, { id: string; input: TestimonialFormValues }>({
    mutationFn: ({ id, input }) => testimonialsService.update(id, input),
    invalidateKeys: [testimonialKeys.all, testimonialKeys.summary],
  });
}

export function useSetTestimonialStatus() {
  return useMutation<Testimonial, { id: string; status: Testimonial["status"] }>({
    mutationFn: ({ id, status }) => testimonialsService.update(id, { status }),
    invalidateKeys: [testimonialKeys.all, testimonialKeys.summary],
  });
}

export function useDeleteTestimonial() {
  return useMutation<void, string>({
    mutationFn: (id) => testimonialsService.remove(id),
    invalidateKeys: [testimonialKeys.all, testimonialKeys.summary],
  });
}
