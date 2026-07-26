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
import { sharedRoomSchema } from "./schemas";
import { useCreateSharedRoom, useUpdateSharedRoom } from "./hooks";
import { SHARED_ROOM_STATUSES, type SharedRoom } from "./types";

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({ value: v, label: v }));

interface SharedRoomFormProps {
  /** Present ⇒ edit mode. */
  initial?: SharedRoom;
  onDone: () => void;
  onCancel: () => void;
}

/** SharedRoomForm — one validated form for both create and edit (drawer-hosted). */
export function SharedRoomForm({ initial, onDone, onCancel }: SharedRoomFormProps) {
  const create = useCreateSharedRoom();
  const update = useUpdateSharedRoom();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(sharedRoomSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      city: initial?.city ?? "",
      country: initial?.country ?? "",
      beds: initial?.beds ?? 0,
      pricePerBed: initial?.pricePerBed ?? 0,
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
        <Alert tone="danger" title="Couldn't save shared room" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Property" description="Name and location.">
        <FormGrid cols={2}>
          <Input
            label="Property name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Status"
            options={statusOptions(SHARED_ROOM_STATUSES)}
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

      <FormSection title="Inventory & pricing" description="Beds and per-bed rate.">
        <FormGrid cols={2}>
          <Input
            label="Beds"
            type="number"
            min={0}
            {...form.register("beds")}
            error={form.formState.errors.beds?.message}
          />
          <Input
            label="Price / bed"
            type="number"
            min={0}
            step="0.01"
            {...form.register("pricePerBed")}
            error={form.formState.errors.pricePerBed?.message}
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
          {isEdit ? "Save changes" : "Add shared room"}
        </Button>
      </FormActions>
    </form>
  );
}
