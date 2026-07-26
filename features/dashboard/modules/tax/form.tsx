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
import { taxSchema } from "./schemas";
import { useCreateTax, useUpdateTax } from "./hooks";
import {
  TAX_CATEGORY_VALUES,
  TAX_STATUSES,
  TAX_TYPES,
  type TaxRule,
} from "./types";

const CATEGORY_OPTIONS = TAX_CATEGORY_VALUES.map((v) => ({ value: v, label: v }));

interface TaxFormProps {
  /** Present ⇒ edit mode. */
  initial?: TaxRule;
  onDone: () => void;
  onCancel: () => void;
}

/** TaxForm — one validated form for both create and edit (drawer-hosted). */
export function TaxForm({ initial, onDone, onCancel }: TaxFormProps) {
  const create = useCreateTax();
  const update = useUpdateTax();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(taxSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      region: initial?.region ?? "",
      category: initial?.category ?? "All bookings",
      rate: initial?.rate ?? 0,
      type: initial?.type ?? "exclusive",
      status: initial?.status ?? "active",
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
        <Alert tone="danger" title="Couldn't save tax rule" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Rule" description="Name and jurisdiction.">
        <FormGrid cols={2}>
          <Input
            label="Rule name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Region"
            required
            hint="Country, union or 'Global'"
            {...form.register("region")}
            error={form.formState.errors.region?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Rate" description="What it applies to and how it's charged.">
        <FormGrid cols={2}>
          <Select
            label="Applies to"
            options={CATEGORY_OPTIONS}
            {...form.register("category")}
            error={form.formState.errors.category?.message}
          />
          <Input
            label="Rate (%)"
            type="number"
            min={0}
            max={100}
            step="0.1"
            {...form.register("rate")}
            error={form.formState.errors.rate?.message}
          />
          <Select
            label="Type"
            options={statusOptions(TAX_TYPES)}
            {...form.register("type")}
            error={form.formState.errors.type?.message}
          />
          <Select
            label="Status"
            options={statusOptions(TAX_STATUSES)}
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
          {isEdit ? "Save changes" : "Add tax rule"}
        </Button>
      </FormActions>
    </form>
  );
}
