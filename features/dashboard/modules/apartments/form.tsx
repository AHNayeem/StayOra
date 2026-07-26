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
import { apartmentSchema } from "./schemas";
import { useCreateApartment, useUpdateApartment } from "./hooks";
import { APARTMENT_STATUSES, type Apartment } from "./types";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({ value: v, label: v }));

interface ApartmentFormProps {
  /** Present ⇒ edit mode. */
  initial?: Apartment;
  onDone: () => void;
  onCancel: () => void;
}

/** ApartmentForm — one validated form for both create and edit (drawer-hosted). */
export function ApartmentForm({ initial, onDone, onCancel }: ApartmentFormProps) {
  const create = useCreateApartment();
  const update = useUpdateApartment();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(apartmentSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      bedrooms: initial?.bedrooms ?? 0,
      maxGuests: initial?.maxGuests ?? 0,
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
        <Alert tone="danger" title="Couldn't save apartment" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Property" description="Name and location.">
        <FormGrid cols={2}>
          <Input
            label="Apartment name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Status"
            options={statusOptions(APARTMENT_STATUSES)}
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

      <FormSection title="Capacity & pricing" description="Bedrooms, guests and nightly rate.">
        <FormGrid cols={2}>
          <Input
            label="Bedrooms"
            type="number"
            min={0}
            {...form.register("bedrooms")}
            error={form.formState.errors.bedrooms?.message}
          />
          <Input
            label="Max guests"
            type="number"
            min={0}
            {...form.register("maxGuests")}
            error={form.formState.errors.maxGuests?.message}
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
          {isEdit ? "Save changes" : "Add apartment"}
        </Button>
      </FormActions>
    </form>
  );
}
