"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useCreateBooking, useUpdateBooking } from "./hooks";
import { BOOKING_STATUSES, type Booking } from "./types";

const LIST_HREF = "/dashboard/bookings";
const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : "");

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

interface BookingFormProps {
  /** Present ⇒ edit mode. */
  initial?: Booking;
  onDone?: () => void;
  onCancel?: () => void;
}

/**
 * BookingForm — the reference form flow: `useZodForm` for typed,
 * schema-validated fields, create/update mutations, inline server error mapping
 * via {@link applyServerErrors}. Serves the create route and the row edit
 * drawer; `onDone`/`onCancel` default to list navigation.
 */
export function BookingForm({ initial, onDone, onCancel }: BookingFormProps) {
  const router = useRouter();
  const create = useCreateBooking();
  const update = useUpdateBooking();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(createBookingSchema, {
    defaultValues: {
      guestName: initial?.guestName ?? "",
      guestEmail: initial?.guestEmail ?? "",
      property: initial?.property ?? "",
      propertyType: initial?.propertyType ?? "Hotel",
      checkIn: toDateInput(initial?.checkIn ?? ""),
      checkOut: toDateInput(initial?.checkOut ?? ""),
      guests: initial?.guests ?? 1,
      amount: initial?.amount ?? 0,
      currency: initial?.currency ?? "USD",
      status: initial?.status ?? "pending",
    },
  });

  const finish = () => (onDone ? onDone() : router.push(LIST_HREF));
  const cancel = () => (onCancel ? onCancel() : router.push(LIST_HREF));

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
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
        <Alert tone="danger" title="Couldn't save booking" className="my-4">
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
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Create booking"}
        </Button>
      </FormActions>
    </form>
  );
}

/** Thin wrapper for the create route — renders {@link BookingForm} in create mode. */
export function BookingCreateForm() {
  return <BookingForm />;
}
