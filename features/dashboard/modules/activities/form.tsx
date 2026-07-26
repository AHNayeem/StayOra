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
import { activitySchema } from "./schemas";
import { useCreateActivity, useUpdateActivity } from "./hooks";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUSES, type Activity } from "./types";

const CATEGORY_OPTIONS = ACTIVITY_CATEGORIES.map((v) => ({ value: v, label: v }));

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "JPY", "MAD"].map((v) => ({
  value: v,
  label: v,
}));

interface ActivityFormProps {
  /** Present ⇒ edit mode. */
  initial?: Activity;
  onDone: () => void;
  onCancel: () => void;
}

/** ActivityForm — one validated form for both create and edit (drawer-hosted). */
export function ActivityForm({ initial, onDone, onCancel }: ActivityFormProps) {
  const create = useCreateActivity();
  const update = useUpdateActivity();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(activitySchema, {
    defaultValues: {
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      category: initial?.category ?? "Tour",
      durationHours: initial?.durationHours ?? 0,
      price: initial?.price ?? 0,
      currency: initial?.currency ?? "USD",
      capacity: initial?.capacity ?? 0,
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
        <Alert tone="danger" title="Couldn't save activity" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Activity" description="Name, location and category.">
        <FormGrid cols={2}>
          <Input
            label="Activity name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            {...form.register("category")}
            error={form.formState.errors.category?.message}
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

      <FormSection title="Details & pricing" description="Duration, capacity and price.">
        <FormGrid cols={2}>
          <Input
            label="Duration (hours)"
            type="number"
            min={0}
            step="0.25"
            {...form.register("durationHours")}
            error={form.formState.errors.durationHours?.message}
          />
          <Input
            label="Capacity"
            type="number"
            min={0}
            {...form.register("capacity")}
            error={form.formState.errors.capacity?.message}
          />
          <Input
            label="Price"
            type="number"
            min={0}
            step="0.01"
            {...form.register("price")}
            error={form.formState.errors.price?.message}
          />
          <Select
            label="Currency"
            options={CURRENCY_OPTIONS}
            {...form.register("currency")}
            error={form.formState.errors.currency?.message}
          />
          <Select
            label="Status"
            options={statusOptions(ACTIVITY_STATUSES)}
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
          {isEdit ? "Save changes" : "Add activity"}
        </Button>
      </FormActions>
    </form>
  );
}
