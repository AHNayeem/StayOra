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
} from "../../ui";
import { statusOptions } from "../../lib/status";
import { conventionHallSchema } from "./schemas";
import { useCreateConventionHall, useUpdateConventionHall } from "./hooks";
import { CONVENTION_HALL_STATUSES, type ConventionHall } from "./types";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED", "SGD"].map((v) => ({
  value: v,
  label: v,
}));

interface ConventionHallFormProps {
  /** Present ⇒ edit mode. */
  initial?: ConventionHall;
  onDone: () => void;
  onCancel: () => void;
}

/** ConventionHallForm — one validated form for both create and edit (drawer-hosted). */
export function ConventionHallForm({
  initial,
  onDone,
  onCancel,
}: ConventionHallFormProps) {
  const create = useCreateConventionHall();
  const update = useUpdateConventionHall();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(conventionHallSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      capacity: initial?.capacity ?? 0,
      halls: initial?.halls ?? 0,
      pricePerDay: initial?.pricePerDay ?? 0,
      currency: initial?.currency ?? "USD",
      status: initial?.status ?? "draft",
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
        <Alert tone="danger" title="Couldn't save venue" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Venue" description="Name and location.">
        <FormGrid cols={2}>
          <Input
            label="Venue name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Status"
            options={statusOptions(CONVENTION_HALL_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
          <Input
            label="City"
            required
            {...form.register("city")}
            error={form.formState.errors.city?.message}
          />
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Capacity & pricing" description="Capacity, halls and daily rate.">
        <FormGrid cols={2}>
          <Input
            label="Capacity"
            type="number"
            min={0}
            {...form.register("capacity")}
            error={form.formState.errors.capacity?.message}
          />
          <Input
            label="Halls"
            type="number"
            min={0}
            {...form.register("halls")}
            error={form.formState.errors.halls?.message}
          />
          <Input
            label="Price / day"
            type="number"
            min={0}
            step="0.01"
            {...form.register("pricePerDay")}
            error={form.formState.errors.pricePerDay?.message}
          />
          <Select
            label="Currency"
            options={CURRENCY_OPTIONS}
            {...form.register("currency")}
            error={form.formState.errors.currency?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Add venue"}
        </Button>
      </FormActions>
    </form>
  );
}
