"use client";

import { useState } from "react";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Button,
  Checkbox,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Textarea,
} from "../../ui";
import { toast } from "@/lib/toast";
import { DESTINATION_OPTIONS } from "../../domain/seed";
import { evaluateOffer } from "../../domain/money";
import { formatCurrency } from "../../lib/format";
import { statusOptions } from "../../lib/status";
import { useRoleView } from "../../domain/use-domain";
import { PRODUCT_KIND_OPTIONS } from "../bookings/types";
import { useCreateOffer, useUpdateOffer } from "./hooks";
import { offerSchema } from "./schemas";
import {
  DISCOUNT_TYPE_OPTIONS,
  ELIGIBILITY_OPTIONS,
  OFFER_SCOPE_OPTIONS,
  OFFER_STATUSES,
  OFFER_TYPE_OPTIONS,
  type Offer,
} from "./types";

const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : "");
const toIso = (date: string) => new Date(`${date}T00:00:00.000Z`).toISOString();

/** Sample basket used by the live preview so the maths is visible while editing. */
const PREVIEW_AMOUNT = 600;

interface OfferFormProps {
  /** Present ⇒ edit mode. */
  initial?: Offer;
  onDone?: () => void;
  onCancel?: () => void;
}

/**
 * Offer form — every field the brief lists, plus a live evaluation.
 *
 * The preview runs the *real* {@link evaluateOffer} engine against a sample
 * basket, so an admin can see immediately whether the rules they typed actually
 * grant a discount (and, when they don't, the exact reason a customer would be
 * shown). Merchants can only create merchant-scoped offers — the scope field is
 * locked and the domain rejects platform scope for them regardless.
 */
export function OfferForm({ initial, onDone, onCancel }: OfferFormProps) {
  const { isMerchant } = useRoleView();
  const create = useCreateOffer();
  const update = useUpdateOffer();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(offerSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      scope: initial?.scope ?? (isMerchant ? "merchant" : "platform"),
      offerType: (initial?.offerType as "promo_code") ?? "promo_code",
      discountType: initial?.discountType ?? "percent",
      value: initial?.value ?? 10,
      promoCode: initial?.promoCode ?? "",
      startAt: toDateInput(initial?.startAt ?? ""),
      endAt: toDateInput(initial?.endAt ?? ""),
      minBookingAmount: initial?.minBookingAmount ?? 0,
      maxDiscount: initial?.maxDiscount ?? 0,
      products: initial?.products ?? [],
      destinations: initial?.destinations ?? [],
      eligibility: initial?.eligibility ?? "all",
      usageLimit: initial?.usageLimit ?? 0,
      perUserLimit: initial?.perUserLimit ?? 1,
      status: initial?.status ?? "draft",
      terms: initial?.terms ?? "",
    },
  });

  const v = form.watch();

  /** Run the real engine against a sample booking to preview the outcome. */
  const preview = (() => {
    if (!v.startAt || !v.endAt) return null;
    const draft: Offer = {
      id: initial?.id ?? "preview",
      name: v.name || "Untitled offer",
      description: v.description ?? "",
      scope: v.scope,
      merchantId: initial?.merchantId,
      offerType: v.offerType,
      discountType: v.discountType,
      value: Number(v.value) || 0,
      promoCode: v.promoCode || undefined,
      startAt: toIso(v.startAt),
      endAt: toIso(v.endAt),
      minBookingAmount: Number(v.minBookingAmount) || 0,
      maxDiscount: Number(v.maxDiscount) || 0,
      products: (v.products ?? []) as Offer["products"],
      destinations: v.destinations ?? [],
      eligibility: v.eligibility,
      usageLimit: Number(v.usageLimit) || 0,
      perUserLimit: Number(v.perUserLimit) || 0,
      used: initial?.used ?? 0,
      status: v.status,
      terms: v.terms ?? "",
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    return {
      draft,
      result: evaluateOffer(draft, {
        amount: PREVIEW_AMOUNT,
        productKind: (v.products?.[0] as Offer["products"][number]) ?? "hotels",
        destination: v.destinations?.[0],
        segment: v.eligibility === "b2b" ? "b2b" : "b2c",
        isNewCustomer: v.eligibility === "new",
        isMember: v.eligibility === "member",
      }),
    };
  })();

  const toggleArray = (field: "products" | "destinations", value: string) => {
    const current = (form.getValues(field) ?? []) as string[];
    form.setValue(
      field,
      current.includes(value)
        ? current.filter((x) => x !== value)
        : [...current, value],
      { shouldValidate: true },
    );
  };

  const onSubmit = form.handleSubmit(async (raw) => {
    setSubmitError(null);
    try {
      const input = {
        name: raw.name,
        description: raw.description,
        scope: raw.scope,
        offerType: raw.offerType,
        discountType: raw.discountType,
        value: raw.value,
        promoCode: raw.promoCode?.trim().toUpperCase() || undefined,
        startAt: toIso(raw.startAt),
        endAt: toIso(raw.endAt),
        minBookingAmount: raw.minBookingAmount,
        maxDiscount: raw.maxDiscount,
        products: raw.products as Offer["products"],
        destinations: raw.destinations,
        eligibility: raw.eligibility,
        usageLimit: raw.usageLimit,
        perUserLimit: raw.perUserLimit,
        status: raw.status,
        terms: raw.terms,
        merchantName: initial?.merchantName,
      };
      if (initial) {
        await update.mutateAsync({ id: initial.id, input });
        toast.success(`Offer "${raw.name}" updated`);
      } else {
        await create.mutateAsync(input);
        toast.success(`Offer "${raw.name}" created`);
      }
      onDone?.();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-1">
      {submitError && (
        <Alert tone="danger" title="Couldn't save offer" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Basics" description="What the offer is called and who owns it.">
        <FormGrid cols={2}>
          <Input
            label="Offer name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Scope"
            options={OFFER_SCOPE_OPTIONS}
            disabled={isMerchant}
            {...form.register("scope")}
            error={form.formState.errors.scope?.message}
            hint={isMerchant ? "Merchants can only create offers on their own products." : undefined}
          />
          <Select
            label="Offer type"
            options={OFFER_TYPE_OPTIONS}
            {...form.register("offerType")}
            error={form.formState.errors.offerType?.message}
          />
          <Select
            label="Status"
            options={statusOptions(OFFER_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
        <Textarea
          label="Description"
          rows={2}
          required
          {...form.register("description")}
          error={form.formState.errors.description?.message}
        />
      </FormSection>

      <FormSection title="Discount" description="How much comes off, and the caps.">
        <FormGrid cols={3}>
          <Select
            label="Discount type"
            options={DISCOUNT_TYPE_OPTIONS}
            {...form.register("discountType")}
            error={form.formState.errors.discountType?.message}
          />
          <Input
            label={v.discountType === "percent" ? "Percentage (%)" : "Amount (USD)"}
            type="number"
            min={0}
            step="0.01"
            {...form.register("value")}
            error={form.formState.errors.value?.message}
          />
          <Input
            label="Maximum discount (USD)"
            type="number"
            min={0}
            step="0.01"
            {...form.register("maxDiscount")}
            error={form.formState.errors.maxDiscount?.message}
            hint="0 = uncapped"
          />
          <Input
            label="Minimum booking amount (USD)"
            type="number"
            min={0}
            step="0.01"
            {...form.register("minBookingAmount")}
            error={form.formState.errors.minBookingAmount?.message}
          />
          <Input
            label="Promo code"
            placeholder="Leave blank to apply automatically"
            {...form.register("promoCode")}
            error={form.formState.errors.promoCode?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Validity & limits" description="When it runs and how often it can be used.">
        <FormGrid cols={2}>
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
          <Input
            label="Total usage limit"
            type="number"
            min={0}
            {...form.register("usageLimit")}
            error={form.formState.errors.usageLimit?.message}
            hint="0 = unlimited"
          />
          <Input
            label="Per-customer limit"
            type="number"
            min={0}
            {...form.register("perUserLimit")}
            error={form.formState.errors.perUserLimit?.message}
            hint="0 = unlimited"
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Applicability"
        description="Leave a group empty to apply the offer to everything in it."
      >
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Applicable products</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PRODUCT_KIND_OPTIONS.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={(v.products ?? []).includes(option.value)}
                onChange={() => toggleArray("products", option.value)}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Applicable destinations</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {DESTINATION_OPTIONS.map((destination) => (
              <Checkbox
                key={destination}
                label={destination}
                checked={(v.destinations ?? []).includes(destination)}
                onChange={() => toggleArray("destinations", destination)}
              />
            ))}
          </div>
        </div>
        <Select
          label="Customer eligibility"
          options={ELIGIBILITY_OPTIONS}
          {...form.register("eligibility")}
          error={form.formState.errors.eligibility?.message}
          wrapperClassName="max-w-sm"
        />
      </FormSection>

      <FormSection title="Terms" description="Shown to the customer with the offer.">
        <Textarea
          label="Terms & conditions"
          rows={3}
          {...form.register("terms")}
          error={form.formState.errors.terms?.message}
        />

        {preview && (
          <div className="rounded-card border border-line bg-surface-muted/50 p-4">
            <p className="text-sm font-semibold text-ink">
              Live check — {formatCurrency(PREVIEW_AMOUNT, "USD")} sample booking
            </p>
            {preview.result.applicable ? (
              <p className="mt-1 text-sm text-body">
                Applies:{" "}
                <strong className="text-success">
                  −{formatCurrency(preview.result.discount, "USD")}
                </strong>{" "}
                → customer pays{" "}
                {formatCurrency(PREVIEW_AMOUNT - preview.result.discount, "USD")}
              </p>
            ) : (
              <p className="mt-1 text-sm text-danger">
                Not applicable: {preview.result.reason}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              Evaluated by the same offer engine used at checkout.
            </p>
          </div>
        )}
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {initial ? "Save offer" : "Create offer"}
        </Button>
      </FormActions>
    </form>
  );
}
