"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { useCreateMerchant } from "./hooks";

// Reference data — placeholder for the taxonomy / localization feeds.
const CATEGORY_OPTIONS = ["Hotels", "Apartments", "Resorts", "Transport", "Activities"]
  .map((v) => ({ value: v, label: v }));
const COUNTRY_OPTIONS = [
  "United States", "United Kingdom", "United Arab Emirates", "Germany", "Japan", "Brazil",
].map((v) => ({ value: v, label: v }));

/** Invite-merchant form — typed, validated onboarding of a new organization. */
export function MerchantCreateForm() {
  const router = useRouter();
  const create = useCreateMerchant();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(createMerchantSchema, {
    defaultValues: {
      name: "",
      email: "",
      contactName: "",
      category: "Hotels",
      country: "United States",
      commissionPercent: 10,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await create.mutateAsync({
        name: values.name,
        email: values.email,
        contactName: values.contactName,
        category: values.category,
        country: values.country,
        commissionRate: values.commissionPercent / 100,
      });
      router.push("/dashboard/merchants");
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't invite merchant" className="my-4">
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
        <Link
          href="/dashboard/merchants"
          className="inline-flex h-9 items-center justify-center rounded-pill px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
        >
          Cancel
        </Link>
        <Button type="submit" size="sm" loading={create.isPending}>
          Send invite
        </Button>
      </FormActions>
    </form>
  );
}
