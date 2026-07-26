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
import { visaSchema } from "./schemas";
import { useCreateVisa, useUpdateVisa } from "./hooks";
import { VISA_STATUSES, VISA_TYPES, type Visa } from "./types";

const TYPE_OPTIONS = VISA_TYPES.map((v) => ({ value: v, label: v }));

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({
  value: v,
  label: v,
}));

interface VisaFormProps {
  /** Present ⇒ edit mode. */
  initial?: Visa;
  onDone: () => void;
  onCancel: () => void;
}

/** VisaForm — one validated form for both create and edit (drawer-hosted). */
export function VisaForm({ initial, onDone, onCancel }: VisaFormProps) {
  const create = useCreateVisa();
  const update = useUpdateVisa();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(visaSchema, {
    defaultValues: {
      country: initial?.country ?? "",
      type: initial?.type ?? "Tourist",
      processingDays: initial?.processingDays ?? 0,
      fee: initial?.fee ?? 0,
      currency: initial?.currency ?? "USD",
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
        <Alert tone="danger" title="Couldn't save visa service" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Service" description="Destination country and visa type.">
        <FormGrid cols={2}>
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            {...form.register("type")}
            error={form.formState.errors.type?.message}
          />
          <Select
            label="Status"
            options={statusOptions(VISA_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Processing & fees" description="Turnaround time and service fee.">
        <FormGrid cols={2}>
          <Input
            label="Processing days"
            type="number"
            min={0}
            {...form.register("processingDays")}
            error={form.formState.errors.processingDays?.message}
          />
          <Input
            label="Fee"
            type="number"
            min={0}
            step="0.01"
            {...form.register("fee")}
            error={form.formState.errors.fee?.message}
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
          {isEdit ? "Save changes" : "Add visa service"}
        </Button>
      </FormActions>
    </form>
  );
}
