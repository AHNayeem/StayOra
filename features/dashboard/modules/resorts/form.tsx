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
import { resortSchema } from "./schemas";
import { useCreateResort, useUpdateResort } from "./hooks";
import { RESORT_STATUSES, type Resort } from "./types";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({ value: v, label: v }));

interface ResortFormProps {
  /** Present ⇒ edit mode. */
  initial?: Resort;
  onDone: () => void;
  onCancel: () => void;
}

/** ResortForm — one validated form for both create and edit (drawer-hosted). */
export function ResortForm({ initial, onDone, onCancel }: ResortFormProps) {
  const create = useCreateResort();
  const update = useUpdateResort();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(resortSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      rooms: initial?.rooms ?? 0,
      rating: initial?.rating ?? 0,
      pricePerNight: initial?.pricePerNight ?? 0,
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
        <Alert tone="danger" title="Couldn't save resort" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Property" description="Name and location.">
        <FormGrid cols={2}>
          <Input
            label="Resort name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Status"
            options={statusOptions(RESORT_STATUSES)}
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

      <FormSection title="Inventory & pricing" description="Rooms, rating and nightly rate.">
        <FormGrid cols={2}>
          <Input
            label="Rooms"
            type="number"
            min={0}
            {...form.register("rooms")}
            error={form.formState.errors.rooms?.message}
          />
          <Input
            label="Rating"
            type="number"
            min={0}
            max={5}
            step="0.1"
            {...form.register("rating")}
            error={form.formState.errors.rating?.message}
          />
          <Input
            label="Price / night"
            type="number"
            min={0}
            step="0.01"
            {...form.register("pricePerNight")}
            error={form.formState.errors.pricePerNight?.message}
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
          {isEdit ? "Save changes" : "Add resort"}
        </Button>
      </FormActions>
    </form>
  );
}
