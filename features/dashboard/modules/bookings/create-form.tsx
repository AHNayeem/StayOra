"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { createBookingSchema } from "./schemas";
import { useCreateBooking } from "./hooks";
import { BOOKING_STATUSES } from "./types";

// Reference option lists — placeholders for the catalog / localization feeds
// (kept out of JSX; a real deployment fetches these).
const PROPERTY_TYPE_OPTIONS = [
  "Hotel", "Apartment", "Resort", "Shared Room", "Convention Hall",
  "Transport", "Activity", "Visa",
].map((v) => ({ value: v, label: v }));

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({
  value: v,
  label: v,
}));

/**
 * Create-booking form — the reference form flow: `useZodForm` for typed,
 * schema-validated fields, `useCreateBooking` for the mutation, inline server
 * error mapping via {@link applyServerErrors}, and redirect on success.
 */
export function BookingCreateForm() {
  const router = useRouter();
  const create = useCreateBooking();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(createBookingSchema, {
    defaultValues: {
      guestName: "",
      guestEmail: "",
      property: "",
      propertyType: "Hotel",
      checkIn: "",
      checkOut: "",
      guests: 1,
      amount: 0,
      currency: "USD",
      status: "pending",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await create.mutateAsync(values);
      router.push("/dashboard/bookings");
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-card border border-line bg-surface px-6 py-2">
      {submitError && (
        <Alert tone="danger" title="Couldn't create booking" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection
        title="Guest"
        description="Who the reservation is for."
      >
        <FormGrid cols={2}>
          <Input
            label="Guest name"
            required
            {...form.register("guestName")}
            error={form.formState.errors.guestName?.message}
          />
          <Input
            label="Guest email"
            type="email"
            required
            {...form.register("guestEmail")}
            error={form.formState.errors.guestEmail?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Stay"
        description="Property and dates for this booking."
      >
        <FormGrid cols={2}>
          <Input
            label="Property"
            required
            {...form.register("property")}
            error={form.formState.errors.property?.message}
          />
          <Select
            label="Property type"
            options={PROPERTY_TYPE_OPTIONS}
            {...form.register("propertyType")}
            error={form.formState.errors.propertyType?.message}
          />
          <Input
            label="Check-in"
            type="date"
            required
            {...form.register("checkIn")}
            error={form.formState.errors.checkIn?.message}
          />
          <Input
            label="Check-out"
            type="date"
            required
            {...form.register("checkOut")}
            error={form.formState.errors.checkOut?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Details"
        description="Occupancy, price and initial status."
      >
        <FormGrid cols={3}>
          <Input
            label="Guests"
            type="number"
            min={1}
            {...form.register("guests")}
            error={form.formState.errors.guests?.message}
          />
          <Input
            label="Amount"
            type="number"
            min={0}
            step="0.01"
            {...form.register("amount")}
            error={form.formState.errors.amount?.message}
          />
          <Select
            label="Currency"
            options={CURRENCY_OPTIONS}
            {...form.register("currency")}
            error={form.formState.errors.currency?.message}
          />
          <Select
            label="Status"
            options={statusOptions(BOOKING_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Link
          href="/dashboard/bookings"
          className="inline-flex h-9 items-center justify-center rounded-pill px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted"
        >
          Cancel
        </Link>
        <Button type="submit" size="sm" loading={create.isPending}>
          Create booking
        </Button>
      </FormActions>
    </form>
  );
}
