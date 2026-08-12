"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "../../data";
import { useZodForm } from "../../forms";
import { applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
} from "../../ui";
import { toast } from "@/lib/toast";
import { B2B_ACCOUNTS, DESTINATION_OPTIONS, MERCHANTS } from "../../domain/seed";
import { PRICING_CONFIG, commissionRateFor, priceB2B, priceBooking } from "../../domain/money";
import { formatCurrency } from "../../lib/format";
import { useRoleView } from "../../domain/use-domain";
import { createBookingSchema } from "./schemas";
import { useCreateBooking } from "./hooks";
import {
  PRODUCT_KIND_OPTIONS,
  SEGMENT_OPTIONS,
  type BookingSegment,
  type ProductKind,
} from "./types";

const LIST_HREF = "/dashboard/bookings";

const MERCHANT_OPTIONS = MERCHANTS.map((m) => ({ value: m.id, label: m.name }));
const DESTINATION_SELECT = DESTINATION_OPTIONS.map((d) => ({ value: d, label: d }));
const ACCOUNT_OPTIONS = B2B_ACCOUNTS.filter((a) => a.status === "active").map((a) => ({
  value: a.id,
  label: `${a.name} (${a.code})`,
}));

/**
 * BookingCreateForm — creates a booking through the domain service.
 *
 * The live price preview is computed with the *same* functions the service uses
 * ({@link priceBooking} / {@link priceB2B}), so what the operator sees before
 * submitting is exactly what gets stored: net rate, markup, commission split and
 * customer total. Bookings land in `payment_pending` so the lifecycle can then be
 * driven from the detail screen.
 */
export function BookingCreateForm() {
  const router = useRouter();
  const create = useCreateBooking();
  const { isAgency, isMerchant } = useRoleView();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(createBookingSchema, {
    defaultValues: {
      segment: isAgency ? "b2b" : "b2c",
      organizationId: isAgency ? ACCOUNT_OPTIONS[0]?.value : "",
      customerName: "",
      customerEmail: "",
      productKind: "hotels",
      productTitle: "",
      destination: DESTINATION_OPTIONS[0],
      merchantId: MERCHANT_OPTIONS[0]?.value ?? "",
      startAt: "",
      endAt: "",
      quantity: 1,
      baseAmount: 0,
      promoCode: "",
      travelerNames: "",
    },
  });

  const values = form.watch();
  const merchant = MERCHANTS.find((m) => m.id === values.merchantId);
  const account = B2B_ACCOUNTS.find((a) => a.id === values.organizationId);
  const base = Number(values.baseAmount) || 0;
  const commissionRate = commissionRateFor(
    (values.productKind as ProductKind) ?? "hotels",
    merchant?.commissionRate,
  );
  const b2b =
    values.segment === "b2b" && account
      ? priceB2B({
          publicRate: base,
          netRateDiscount: account.netRateDiscount,
          markupRate: account.defaultMarkupRate,
        })
      : null;
  const preview = priceBooking({
    base: b2b ? b2b.netRate : base,
    markup: b2b ? b2b.markup : 0,
    commissionRate,
  });

  const onSubmit = form.handleSubmit(async (raw) => {
    setSubmitError(null);
    try {
      const booking = await create.mutateAsync({
        segment: raw.segment as BookingSegment,
        organizationId: raw.segment === "b2b" ? raw.organizationId : undefined,
        customerName: raw.customerName,
        customerEmail: raw.customerEmail,
        productKind: raw.productKind as ProductKind,
        productTitle: raw.productTitle,
        destination: raw.destination,
        merchantId: raw.merchantId,
        startAt: new Date(raw.startAt).toISOString(),
        endAt: new Date(raw.endAt).toISOString(),
        quantity: raw.quantity,
        baseAmount: raw.baseAmount,
        promoCode: raw.promoCode?.trim() || undefined,
        travelerNames: raw.travelerNames
          ? raw.travelerNames.split(",").map((n) => n.trim()).filter(Boolean)
          : undefined,
        channel: raw.segment === "b2b" ? "agency" : "call_center",
      });
      toast.success(`Booking ${booking.reference} created`, {
        description: "Awaiting payment — drive the lifecycle from the booking detail.",
      });
      router.push(`/dashboard/bookings/${booking.id}`);
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
        <Alert tone="danger" title="Couldn't create booking" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection
        title="Segment"
        description="B2C bookings are paid by the customer; B2B bookings are invoiced to an agency or corporate account on credit."
      >
        <FormGrid cols={2}>
          <Select
            label="Business model"
            options={SEGMENT_OPTIONS}
            disabled={isAgency}
            {...form.register("segment")}
            error={form.formState.errors.segment?.message}
          />
          {values.segment === "b2b" && (
            <Select
              label="B2B account"
              options={ACCOUNT_OPTIONS}
              placeholder="Select an account"
              {...form.register("organizationId")}
              error={form.formState.errors.organizationId?.message}
              hint={
                account
                  ? `Net rate −${account.netRateDiscount}% · markup ${account.defaultMarkupRate}% · ${account.settlementTerm.replace("_", " ")}`
                  : undefined
              }
            />
          )}
        </FormGrid>
      </FormSection>

      <FormSection title="Customer" description="Who is travelling.">
        <FormGrid cols={2}>
          <Input
            label="Customer name"
            required
            {...form.register("customerName")}
            error={form.formState.errors.customerName?.message}
          />
          <Input
            label="Customer email"
            type="email"
            required
            {...form.register("customerEmail")}
            error={form.formState.errors.customerEmail?.message}
          />
          <Input
            label="Travelers"
            placeholder="Comma-separated names (optional)"
            {...form.register("travelerNames")}
            error={form.formState.errors.travelerNames?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Product" description="What is being booked, and from whom.">
        <FormGrid cols={2}>
          <Select
            label="Product type"
            options={PRODUCT_KIND_OPTIONS}
            {...form.register("productKind")}
            error={form.formState.errors.productKind?.message}
          />
          <Input
            label="Product title"
            required
            placeholder="e.g. Azure Bay Grand — Deluxe King"
            {...form.register("productTitle")}
            error={form.formState.errors.productTitle?.message}
          />
          <Select
            label="Merchant / provider"
            options={MERCHANT_OPTIONS}
            disabled={isMerchant}
            {...form.register("merchantId")}
            error={form.formState.errors.merchantId?.message}
            hint={merchant ? `Contracted commission ${merchant.commissionRate}%` : undefined}
          />
          <Select
            label="Destination"
            options={DESTINATION_SELECT}
            {...form.register("destination")}
            error={form.formState.errors.destination?.message}
          />
          <Input
            label="Start date"
            type="date"
            required
            {...form.register("startAt")}
            error={form.formState.errors.startAt?.message}
          />
          <Input
            label="End date"
            type="date"
            required
            {...form.register("endAt")}
            error={form.formState.errors.endAt?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Pricing"
        description="Enter the list price only — the platform derives discounts, taxes, fees and the commission split."
      >
        <FormGrid cols={3}>
          <Input
            label="Units / rooms"
            type="number"
            min={1}
            {...form.register("quantity")}
            error={form.formState.errors.quantity?.message}
          />
          <Input
            label={`List price (${PRICING_CONFIG.currency})`}
            type="number"
            min={0}
            step="0.01"
            {...form.register("baseAmount")}
            error={form.formState.errors.baseAmount?.message}
          />
          <Input
            label="Promo code"
            placeholder="e.g. MONSOON15"
            {...form.register("promoCode")}
            error={form.formState.errors.promoCode?.message}
            hint="Validated against the offer rules on submit"
          />
        </FormGrid>

        {base > 0 && (
          <div className="rounded-card border border-line bg-surface-muted/50 p-4">
            <p className="text-sm font-semibold text-ink">Price preview</p>
            <p className="mt-0.5 text-xs text-muted">
              Calculated by the same commission engine that will store the booking.
              Any promo code is applied on submit.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              {b2b && (
                <>
                  <Row label="Public rate" value={formatCurrency(b2b.publicRate, preview.currency)} />
                  <Row label="Agency net rate" value={formatCurrency(b2b.netRate, preview.currency)} />
                  <Row label="Agency markup" value={formatCurrency(b2b.markup, preview.currency)} />
                </>
              )}
              <Row label="Net sale" value={formatCurrency(preview.netSale, preview.currency)} />
              <Row label="Taxes" value={formatCurrency(preview.taxes, preview.currency)} />
              <Row label="Platform fee" value={formatCurrency(preview.fees, preview.currency)} />
              <Row
                label={values.segment === "b2b" ? "Agency invoiced" : "Customer pays"}
                value={formatCurrency(preview.total, preview.currency)}
                strong
              />
              <Row
                label={`Commission (${preview.commissionRate}%)`}
                value={formatCurrency(preview.commission, preview.currency)}
              />
              <Row
                label="Merchant earning"
                value={formatCurrency(preview.merchantEarning, preview.currency)}
                strong
              />
            </dl>
          </div>
        )}
      </FormSection>

      <FormActions>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(LIST_HREF)}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={create.isPending}>
          Create booking
        </Button>
      </FormActions>
    </form>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={
          strong ? "font-semibold tabular-nums text-ink" : "tabular-nums text-body"
        }
      >
        {value}
      </dd>
    </div>
  );
}
