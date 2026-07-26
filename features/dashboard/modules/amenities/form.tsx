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
import { amenitySchema } from "./schemas";
import { useCreateAmenity, useUpdateAmenity } from "./hooks";
import {
  AMENITY_CATEGORY_VALUES,
  AMENITY_STATUSES,
  type Amenity,
} from "./types";

const CATEGORY_OPTIONS = AMENITY_CATEGORY_VALUES.map((v) => ({
  value: v,
  label: v,
}));

interface AmenityFormProps {
  /** Present ⇒ edit mode. */
  initial?: Amenity;
  onDone: () => void;
  onCancel: () => void;
}

/** AmenityForm — one validated form for both create and edit (drawer-hosted). */
export function AmenityForm({ initial, onDone, onCancel }: AmenityFormProps) {
  const create = useCreateAmenity();
  const update = useUpdateAmenity();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(amenitySchema, {
    defaultValues: {
      name: initial?.name ?? "",
      category: initial?.category ?? "Room",
      icon: initial?.icon ?? "",
      status: initial?.status ?? "enabled",
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
        <Alert tone="danger" title="Couldn't save amenity" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Amenity" description="Name, category and icon.">
        <FormGrid cols={2}>
          <Input
            label="Amenity name"
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
            label="Icon"
            required
            hint="Icon key, e.g. wifi"
            className="font-mono"
            {...form.register("icon")}
            error={form.formState.errors.icon?.message}
          />
          <Select
            label="Status"
            options={statusOptions(AMENITY_STATUSES)}
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
          {isEdit ? "Save changes" : "Add amenity"}
        </Button>
      </FormActions>
    </form>
  );
}
