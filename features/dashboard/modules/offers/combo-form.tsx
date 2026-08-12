"use client";

import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Textarea,
} from "../../ui";
import { toast } from "@/lib/toast";
import { DESTINATION_OPTIONS, MERCHANTS } from "../../domain/seed";
import { CANCELLATION_POLICY_LIST } from "../../domain/lifecycle";
import { money } from "../../domain/money";
import { formatCurrency } from "../../lib/format";
import { statusOptions } from "../../lib/status";
import { PRODUCT_KIND_OPTIONS } from "../bookings/types";
import { useCreateCombo, useUpdateCombo } from "./hooks";
import { comboSchema } from "./schemas";
import {
  ELIGIBILITY_OPTIONS,
  OFFER_STATUSES,
  REFUND_HANDLING_OPTIONS,
  type ComboOffer,
} from "./types";

const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : "");
const toIso = (date: string) => new Date(`${date}T00:00:00.000Z`).toISOString();

const MERCHANT_OPTIONS = MERCHANTS.map((m) => ({ value: m.id, label: m.name }));
const DESTINATION_SELECT = DESTINATION_OPTIONS.map((d) => ({ value: d, label: d }));
const POLICY_OPTIONS = CANCELLATION_POLICY_LIST.map((p) => ({
  value: p.id,
  label: `${p.label} — ${p.summary}`,
}));

interface ComboFormProps {
  initial?: ComboOffer;
  onDone?: () => void;
  onCancel?: () => void;
}

/**
 * Combo builder — assembles a multi-product, multi-merchant bundle.
 *
 * Items can come from different merchants (flight + hotel + transfer + tour), and
 * the bundle discount is allocated back to each item pro-rata by the domain. That
 * allocation is what makes per-merchant commission and partial refunds possible on
 * a combo later, which is why the form shows it while you build.
 */
export function ComboForm({ initial, onDone, onCancel }: ComboFormProps) {
  const create = useCreateCombo();
  const update = useUpdateCombo();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(comboSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      destination: initial?.destination ?? DESTINATION_OPTIONS[0],
      items:
        initial?.items.map((i) => ({
          kind: i.kind,
          title: i.title,
          merchantId: i.merchantId,
          price: i.price,
          detail: i.detail,
        })) ??
        [
          { kind: "flights", title: "", merchantId: "mrc_skyfare", price: 0, detail: "" },
          { kind: "hotels", title: "", merchantId: "mrc_azure", price: 0, detail: "" },
        ],
      comboPrice: initial?.comboPrice ?? 0,
      validFrom: toDateInput(initial?.validFrom ?? ""),
      validTo: toDateInput(initial?.validTo ?? ""),
      inventory: initial?.inventory ?? 50,
      eligibility: initial?.eligibility ?? "all",
      cancellationPolicyId: initial?.cancellationPolicyId ?? "moderate",
      refundHandling: initial?.refundHandling ?? "pro_rata",
      status: initial?.status ?? "draft",
      terms: initial?.terms ?? "",
    },
  });

  const items = useFieldArray({ control: form.control, name: "items" });
  const v = form.watch();

  const individualTotal = money(
    (v.items ?? []).reduce((sum, item) => sum + (Number(item?.price) || 0), 0),
  );
  const comboPrice = Number(v.comboPrice) || 0;
  const savings = money(Math.max(0, individualTotal - comboPrice));
  const savingsPercent = individualTotal > 0 ? money((savings / individualTotal) * 100) : 0;
  const ratio = individualTotal > 0 ? comboPrice / individualTotal : 0;

  const onSubmit = form.handleSubmit(async (raw) => {
    setSubmitError(null);
    try {
      const input = {
        name: raw.name,
        slug: raw.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: raw.description,
        destination: raw.destination,
        items: raw.items.map((item, index) => {
          const merchant = MERCHANTS.find((m) => m.id === item.merchantId);
          return {
            id: `${initial?.id ?? "cmb"}_item_${index}`,
            kind: item.kind as ComboOffer["items"][number]["kind"],
            title: item.title,
            merchantId: item.merchantId,
            merchantName: merchant?.name ?? item.merchantId,
            price: item.price,
            detail: item.detail,
          };
        }),
        comboPrice: raw.comboPrice,
        validFrom: toIso(raw.validFrom),
        validTo: toIso(raw.validTo),
        inventory: raw.inventory,
        eligibility: raw.eligibility,
        cancellationPolicyId: raw.cancellationPolicyId,
        refundHandling: raw.refundHandling,
        status: raw.status,
        terms: raw.terms,
      };
      if (initial) {
        await update.mutateAsync({ id: initial.id, input });
        toast.success(`Combo "${raw.name}" updated`);
      } else {
        await create.mutateAsync(input);
        toast.success(`Combo "${raw.name}" created`, {
          description: `Saves customers ${formatCurrency(savings, "USD")} versus booking separately.`,
        });
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
        <Alert tone="danger" title="Couldn't save combo" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Bundle" description="What the package is and where it goes.">
        <FormGrid cols={2}>
          <Input
            label="Combo name"
            required
            placeholder="e.g. Dubai Explorer Combo"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Select
            label="Destination"
            options={DESTINATION_SELECT}
            {...form.register("destination")}
            error={form.formState.errors.destination?.message}
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

      <FormSection
        title="Products"
        description="Two or more products, which may belong to different merchants."
      >
        <div className="space-y-3">
          {items.fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-card border border-line p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Type"
                  options={PRODUCT_KIND_OPTIONS.filter((o) => o.value !== "combo")}
                  {...form.register(`items.${index}.kind`)}
                  error={form.formState.errors.items?.[index]?.kind?.message}
                />
                <Input
                  label="Title"
                  {...form.register(`items.${index}.title`)}
                  error={form.formState.errors.items?.[index]?.title?.message}
                />
                <Select
                  label="Merchant"
                  options={MERCHANT_OPTIONS}
                  {...form.register(`items.${index}.merchantId`)}
                  error={form.formState.errors.items?.[index]?.merchantId?.message}
                />
                <Input
                  label="Standalone price (USD)"
                  type="number"
                  min={0}
                  step="0.01"
                  {...form.register(`items.${index}.price`)}
                  error={form.formState.errors.items?.[index]?.price?.message}
                />
                <Input
                  label="Detail"
                  placeholder="e.g. 4 nights, twin room"
                  wrapperClassName="sm:col-span-2 lg:col-span-3"
                  {...form.register(`items.${index}.detail`)}
                  error={form.formState.errors.items?.[index]?.detail?.message}
                />
                <div className="flex items-end justify-between gap-2">
                  <span className="text-xs text-muted">
                    Allocated:{" "}
                    <strong className="text-ink">
                      {formatCurrency(
                        money((Number(v.items?.[index]?.price) || 0) * ratio),
                        "USD",
                      )}
                    </strong>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove product ${index + 1}`}
                    disabled={items.fields.length <= 2}
                    onClick={() => items.remove(index)}
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {form.formState.errors.items?.message && (
            <p className="text-sm text-danger">{form.formState.errors.items.message}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="size-4" />}
            onClick={() =>
              items.append({
                kind: "activities",
                title: "",
                merchantId: MERCHANT_OPTIONS[0].value,
                price: 0,
                detail: "",
              })
            }
          >
            Add product
          </Button>
        </div>
      </FormSection>

      <FormSection
        title="Pricing"
        description="The bundle price must beat the sum of the parts — that difference is the advertised saving."
      >
        <FormGrid cols={3}>
          <Input
            label="Combo price (USD)"
            type="number"
            min={0}
            step="0.01"
            required
            {...form.register("comboPrice")}
            error={form.formState.errors.comboPrice?.message}
          />
          <Input
            label="Packages available"
            type="number"
            min={1}
            {...form.register("inventory")}
            error={form.formState.errors.inventory?.message}
            hint="Prototype inventory counter"
          />
          <Select
            label="Status"
            options={statusOptions(OFFER_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>

        <div className="rounded-card border border-line bg-surface-muted/50 p-4">
          <dl className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Individual total</dt>
              <dd className="text-base font-semibold tabular-nums text-muted line-through">
                {formatCurrency(individualTotal, "USD")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Combo price</dt>
              <dd className="text-base font-bold tabular-nums text-ink">
                {formatCurrency(comboPrice, "USD")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Customer saves</dt>
              <dd className="text-base font-bold tabular-nums text-success">
                {formatCurrency(savings, "USD")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Discount</dt>
              <dd className="text-base font-semibold tabular-nums text-ink">
                {savingsPercent}%
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            The bundle discount is allocated to each product pro-rata, so each
            merchant&apos;s commission and any partial refund stay correct.
          </p>
        </div>
      </FormSection>

      <FormSection
        title="Validity, eligibility & refunds"
        description="How the bundle behaves once booked."
      >
        <FormGrid cols={2}>
          <Input
            label="Valid from"
            type="date"
            required
            {...form.register("validFrom")}
            error={form.formState.errors.validFrom?.message}
          />
          <Input
            label="Valid to"
            type="date"
            required
            {...form.register("validTo")}
            error={form.formState.errors.validTo?.message}
          />
          <Select
            label="Customer eligibility"
            options={ELIGIBILITY_OPTIONS}
            {...form.register("eligibility")}
            error={form.formState.errors.eligibility?.message}
          />
          <Select
            label="Cancellation policy"
            options={POLICY_OPTIONS}
            {...form.register("cancellationPolicyId")}
            error={form.formState.errors.cancellationPolicyId?.message}
          />
          <Select
            label="Refund handling"
            options={REFUND_HANDLING_OPTIONS}
            {...form.register("refundHandling")}
            error={form.formState.errors.refundHandling?.message}
            hint="How a refund is split when only part of the bundle is cancelled"
          />
        </FormGrid>
        <Textarea
          label="Terms & conditions"
          rows={3}
          {...form.register("terms")}
          error={form.formState.errors.terms?.message}
        />
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {initial ? "Save combo" : "Create combo"}
        </Button>
      </FormActions>
    </form>
  );
}
