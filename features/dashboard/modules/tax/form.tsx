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
  TAX_BASES,
  TAX_CATEGORY_VALUES,
  TAX_JURISDICTIONS,
  TAX_STATUSES,
  TAX_TYPES,
  isPercentageBasis,
  type TaxRule,
} from "./types";

const CATEGORY_OPTIONS = TAX_CATEGORY_VALUES.map((v) => ({ value: v, label: v }));
const JURISDICTION_OPTIONS = TAX_JURISDICTIONS.map((j) => ({
  value: j.code,
  label: j.label,
}));

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
      region: initial?.region ?? "GLOBAL",
      category: initial?.category ?? "All bookings",
      basis: initial?.basis ?? "net_sale",
      rate: initial?.rate ?? 0,
      amount: initial?.amount ?? 0,
      type: initial?.type ?? "exclusive",
      priority: initial?.priority ?? 10,
      status: initial?.status ?? "active",
      effectiveFrom: initial?.effectiveFrom?.slice(0, 10) ?? "",
      effectiveTo: initial?.effectiveTo?.slice(0, 10) ?? "",
    },
  });

  const basis = form.watch("basis");
  const percentage = isPercentageBasis(basis);

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

      <FormSection title="Rule" description="Name, jurisdiction and what it covers.">
        <FormGrid cols={2}>
          <Input
            label="Rule name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Jurisdiction"
            options={JURISDICTION_OPTIONS}
            hint="Matched against the destination country"
            {...form.register("region")}
            error={form.formState.errors.region?.message}
          />
          <Select
            label="Applies to"
            options={CATEGORY_OPTIONS}
            {...form.register("category")}
            error={form.formState.errors.category?.message}
          />
          <Input
            label="Priority"
            type="number"
            min={0}
            step="1"
            hint="Lower is charged first"
            {...form.register("priority")}
            error={form.formState.errors.priority?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Charge" description="How much, measured against what.">
        <FormGrid cols={2}>
          <Select
            label="Charged on"
            options={statusOptions(TAX_BASES)}
            {...form.register("basis")}
            error={form.formState.errors.basis?.message}
          />
          {percentage ? (
            <Input
              label="Rate (%)"
              type="number"
              min={0}
              max={100}
              step="0.1"
              {...form.register("rate")}
              error={form.formState.errors.rate?.message}
            />
          ) : (
            <Input
              label="Amount (USD)"
              type="number"
              min={0}
              step="0.01"
              hint="Multiplied by the count the basis implies"
              {...form.register("amount")}
              error={form.formState.errors.amount?.message ?? form.formState.errors.rate?.message}
            />
          )}
          <Select
            label="Type"
            options={statusOptions(TAX_TYPES)}
            hint="Inclusive tax is shown but never added to the total"
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

      <FormSection title="Effective window" description="Leave blank for always on.">
        <FormGrid cols={2}>
          <Input
            label="From"
            type="date"
            {...form.register("effectiveFrom")}
            error={form.formState.errors.effectiveFrom?.message}
          />
          <Input
            label="To"
            type="date"
            {...form.register("effectiveTo")}
            error={form.formState.errors.effectiveTo?.message}
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
