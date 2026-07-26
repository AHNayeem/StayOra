"use client";

import { useState } from "react";
import { getErrorMessage } from "../../data";
import { useZodForm, applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Textarea,
} from "../../ui";
import { statusOptions } from "../../lib/status";
import { testimonialSchema } from "./schemas";
import { useCreateTestimonial, useUpdateTestimonial } from "./hooks";
import { TESTIMONIAL_STATUSES, type Testimonial } from "./types";

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: `${n} star${n === 1 ? "" : "s"}`,
}));

interface TestimonialFormProps {
  /** Present ⇒ edit mode. */
  initial?: Testimonial;
  onDone: () => void;
  onCancel: () => void;
}

/** TestimonialForm — one validated form for both create and edit (drawer-hosted). */
export function TestimonialForm({ initial, onDone, onCancel }: TestimonialFormProps) {
  const create = useCreateTestimonial();
  const update = useUpdateTestimonial();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(testimonialSchema, {
    defaultValues: {
      author: initial?.author ?? "",
      role: initial?.role ?? "",
      location: initial?.location ?? "",
      quote: initial?.quote ?? "",
      rating: initial?.rating ?? 5,
      status: initial?.status ?? "pending",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-surface px-6 py-2"
    >
      {submitError && (
        <Alert tone="danger" title="Couldn't save testimonial" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Author" description="Who left the testimonial.">
        <FormGrid cols={3}>
          <Input
            label="Name"
            required
            {...form.register("author")}
            error={form.formState.errors.author?.message}
          />
          <Input
            label="Role"
            required
            hint="e.g. Family traveller"
            {...form.register("role")}
            error={form.formState.errors.role?.message}
          />
          <Input
            label="Location"
            hint="City, country"
            {...form.register("location")}
            error={form.formState.errors.location?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Testimonial" description="Quote, rating and visibility.">
        <FormGrid cols={1}>
          <Textarea
            label="Quote"
            required
            rows={3}
            {...form.register("quote")}
            error={form.formState.errors.quote?.message}
          />
        </FormGrid>
        <FormGrid cols={2}>
          <Select
            label="Rating"
            options={RATING_OPTIONS}
            {...form.register("rating")}
            error={form.formState.errors.rating?.message}
          />
          <Select
            label="Status"
            options={statusOptions(TESTIMONIAL_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Add testimonial"}
        </Button>
      </FormActions>
    </form>
  );
}
