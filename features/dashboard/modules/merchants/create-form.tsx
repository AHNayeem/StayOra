"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BOOKING_VERTICALS, VERTICAL_LABELS, type BookingVertical } from "@/types/booking";
import { getErrorMessage } from "../../data";
import { useZodForm, applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  Checkbox,
  FormGrid,
  FormSection,
  FormActions,
  Input,
  Select,
  Textarea,
} from "../../ui";
import { registerMerchantSchema, type RegisterMerchantValues } from "./schemas";
import { useRegisterMerchant } from "./hooks";

const LIST_HREF = "/dashboard/merchants";

/** Placeholder for the localization/geo feed. */
const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Germany",
  "Japan",
  "Brazil",
  "Bangladesh",
  "Singapore",
  "Thailand",
  "Malaysia",
  "Maldives",
  "Türkiye",
].map((v) => ({ value: v, label: v }));

export interface MerchantFormProps {
  /** Where to go after a successful registration. */
  onDone?: (merchantId: string) => void;
  onCancel?: () => void;
  /** Copy for the submit button — the public form says something different. */
  submitLabel?: string;
}

/**
 * Merchant registration — step 0 of onboarding.
 *
 * Creates a merchant in `draft`; nothing is verified and nothing can be sold
 * until the application is submitted, reviewed and approved. The same form
 * serves the admin invite route and the public "become a partner" page.
 */
export function MerchantForm({ onDone, onCancel, submitLabel = "Create application" }: MerchantFormProps) {
  const router = useRouter();
  const register = useRegisterMerchant();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(registerMerchantSchema, {
    defaultValues: {
      name: "",
      legalName: "",
      email: "",
      phone: "",
      contactName: "",
      contactRole: "Owner",
      country: "United States",
      city: "",
      verticals: [] as BookingVertical[],
      website: "",
      description: "",
    },
  });

  const verticals = form.watch("verticals") ?? [];
  const toggleVertical = (vertical: BookingVertical, on: boolean) => {
    const next = on ? [...verticals, vertical] : verticals.filter((v) => v !== vertical);
    form.setValue("verticals", next, { shouldValidate: form.formState.isSubmitted });
  };

  const onSubmit = form.handleSubmit(async (values: RegisterMerchantValues) => {
    setSubmitError(null);
    try {
      const merchant = await register.mutateAsync({
        name: values.name,
        legalName: values.legalName,
        email: values.email,
        phone: values.phone,
        contactName: values.contactName,
        contactRole: values.contactRole,
        country: values.country,
        city: values.city,
        verticals: values.verticals,
        website: values.website || undefined,
        description: values.description,
      });
      if (onDone) onDone(merchant.id);
      else router.push(`${LIST_HREF}/${merchant.id}`);
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't create the application" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Business" description="The trading and registered names of the business.">
        <FormGrid cols={2}>
          <Input
            label="Trading name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Registered legal name"
            required
            {...form.register("legalName")}
            error={form.formState.errors.legalName?.message}
          />
          <Select
            label="Country"
            options={COUNTRY_OPTIONS}
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
          <Input
            label="City"
            required
            {...form.register("city")}
            error={form.formState.errors.city?.message}
          />
          <Input
            label="Website"
            placeholder="https://"
            {...form.register("website")}
            error={form.formState.errors.website?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="What do you supply?"
        description="Choose every product you want to sell. This decides which listings you can create."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {BOOKING_VERTICALS.map((vertical) => (
            <Checkbox
              key={vertical}
              label={VERTICAL_LABELS[vertical]}
              checked={verticals.includes(vertical)}
              onChange={(e) => toggleVertical(vertical, e.target.checked)}
            />
          ))}
        </div>
        {form.formState.errors.verticals?.message && (
          <p className="mt-2 text-xs font-medium text-danger">
            {form.formState.errors.verticals.message}
          </p>
        )}
      </FormSection>

      <FormSection title="Contact" description="Who we contact about bookings, compliance and payouts.">
        <FormGrid cols={2}>
          <Input
            label="Contact name"
            required
            {...form.register("contactName")}
            error={form.formState.errors.contactName?.message}
          />
          <Input
            label="Role"
            {...form.register("contactRole")}
            error={form.formState.errors.contactRole?.message}
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
        </FormGrid>
      </FormSection>

      <FormSection title="About the business" description="Optional now — required before you submit.">
        <Textarea
          label="Description"
          rows={4}
          {...form.register("description")}
          error={form.formState.errors.description?.message}
          placeholder="What you operate, where, and what makes it worth booking."
        />
      </FormSection>

      <FormActions>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => (onCancel ? onCancel() : router.push(LIST_HREF))}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={register.isPending}>
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}

/** Thin wrapper for the admin invite route. */
export function MerchantCreateForm() {
  return <MerchantForm />;
}
