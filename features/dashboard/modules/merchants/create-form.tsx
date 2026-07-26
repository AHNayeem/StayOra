"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "../../data";
import { useZodForm, applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  FormGrid,
  FormSection,
  FormActions,
  Input,
  Select,
} from "../../ui";
import { createMerchantSchema } from "./schemas";
import { useCreateMerchant, useUpdateMerchant } from "./hooks";
import type { Merchant } from "./types";

const LIST_HREF = "/dashboard/merchants";

// Reference data — placeholder for the taxonomy / localization feeds.
const CATEGORY_OPTIONS = ["Hotels", "Apartments", "Resorts", "Transport", "Activities"]
  .map((v) => ({ value: v, label: v }));
const COUNTRY_OPTIONS = [
  "United States", "United Kingdom", "United Arab Emirates", "Germany", "Japan", "Brazil",
].map((v) => ({ value: v, label: v }));

interface MerchantFormProps {
  /** Present ⇒ edit mode. */
  initial?: Merchant;
  onDone?: () => void;
  onCancel?: () => void;
}

/**
 * MerchantForm — typed, validated create/edit of a merchant organization.
 * Serves the invite route and the row edit drawer; `onDone`/`onCancel` default
 * to list navigation.
 */
export function MerchantForm({ initial, onDone, onCancel }: MerchantFormProps) {
  const router = useRouter();
  const create = useCreateMerchant();
  const update = useUpdateMerchant();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(createMerchantSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      contactName: initial?.contactName ?? "",
      category: initial?.category ?? "Hotels",
      country: initial?.country ?? "United States",
      commissionPercent: initial ? Math.round(initial.commissionRate * 1000) / 10 : 10,
    },
  });

  const finish = () => (onDone ? onDone() : router.push(LIST_HREF));
  const cancel = () => (onCancel ? onCancel() : router.push(LIST_HREF));

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      email: values.email,
      contactName: values.contactName,
      category: values.category,
      country: values.country,
      commissionRate: values.commissionPercent / 100,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: payload });
      else await create.mutateAsync(payload);
      finish();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't save merchant" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Organization" description="The merchant business details.">
        <FormGrid cols={2}>
          <Input
            label="Business name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Billing email"
            type="email"
            required
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            {...form.register("category")}
            error={form.formState.errors.category?.message}
          />
          <Select
            label="Country"
            options={COUNTRY_OPTIONS}
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Contact & terms" description="Primary contact and commission.">
        <FormGrid cols={2}>
          <Input
            label="Contact name"
            required
            {...form.register("contactName")}
            error={form.formState.errors.contactName?.message}
          />
          <Input
            label="Commission (%)"
            type="number"
            min={0}
            max={100}
            step="0.5"
            {...form.register("commissionPercent")}
            error={form.formState.errors.commissionPercent?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Send invite"}
        </Button>
      </FormActions>
    </form>
  );
}

/** Thin wrapper for the invite route — renders {@link MerchantForm} in create mode. */
export function MerchantCreateForm() {
  return <MerchantForm />;
}
