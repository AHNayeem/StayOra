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
import { transportSchema } from "./schemas";
import { useCreateTransport, useUpdateTransport } from "./hooks";
import { TRANSPORT_STATUSES, TRANSPORT_TYPES, type Transport } from "./types";

const TYPE_OPTIONS = TRANSPORT_TYPES.map((v) => ({ value: v, label: v }));

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({
  value: v,
  label: v,
}));

interface TransportFormProps {
  /** Present ⇒ edit mode. */
  initial?: Transport;
  onDone: () => void;
  onCancel: () => void;
}

/** TransportForm — one validated form for both create and edit (drawer-hosted). */
export function TransportForm({ initial, onDone, onCancel }: TransportFormProps) {
  const create = useCreateTransport();
  const update = useUpdateTransport();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(transportSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      type: initial?.type ?? "Car",
      route: initial?.route ?? "",
      seats: initial?.seats ?? 0,
      pricePerTrip: initial?.pricePerTrip ?? 0,
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
        <Alert tone="danger" title="Couldn't save transport" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Service" description="Name, type and route.">
        <FormGrid cols={2}>
          <Input
            label="Service name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            {...form.register("type")}
            error={form.formState.errors.type?.message}
          />
          <Input
            label="Route"
            required
            hint="e.g. Airport → City"
            {...form.register("route")}
            error={form.formState.errors.route?.message}
          />
          <Select
            label="Status"
            options={statusOptions(TRANSPORT_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Capacity & pricing" description="Seats and per-trip rate.">
        <FormGrid cols={2}>
          <Input
            label="Seats"
            type="number"
            min={0}
            {...form.register("seats")}
            error={form.formState.errors.seats?.message}
          />
          <Input
            label="Price / trip"
            type="number"
            min={0}
            step="0.01"
            {...form.register("pricePerTrip")}
            error={form.formState.errors.pricePerTrip?.message}
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
          {isEdit ? "Save changes" : "Add transport"}
        </Button>
      </FormActions>
    </form>
  );
}
