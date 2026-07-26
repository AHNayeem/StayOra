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
import { customerSchema } from "./schemas";
import { useCreateCustomer, useUpdateCustomer } from "./hooks";
import { CUSTOMER_STATUSES, type Customer } from "./types";

interface CustomerFormProps {
  /** Present ⇒ edit mode. */
  initial?: Customer;
  onDone: () => void;
  onCancel: () => void;
}

/** CustomerForm — one validated form for both create and edit (drawer-hosted). */
export function CustomerForm({ initial, onDone, onCancel }: CustomerFormProps) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(customerSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      country: initial?.country ?? "",
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
        <Alert tone="danger" title="Couldn't save customer" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Contact" description="Name and how to reach them.">
        <FormGrid cols={2}>
          <Input
            label="Full name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            required
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          <Input
            label="Phone"
            required
            {...form.register("phone")}
            error={form.formState.errors.phone?.message}
          />
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Account" description="Directory status.">
        <FormGrid cols={2}>
          <Select
            label="Status"
            options={statusOptions(CUSTOMER_STATUSES)}
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
          {isEdit ? "Save changes" : "Add customer"}
        </Button>
      </FormActions>
    </form>
  );
}
