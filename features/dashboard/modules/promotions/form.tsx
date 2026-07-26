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
import { promotionSchema } from "./schemas";
import { useCreatePromotion, useUpdatePromotion } from "./hooks";
import { PROMOTION_STATUSES, type Promotion } from "./types";

const TYPE_OPTIONS = ["Coupon", "Flash Sale", "Campaign", "Offer", "Gift Card"].map(
  (v) => ({ value: v, label: v }),
);
const DISCOUNT_TYPE_OPTIONS = [
  { value: "percent", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed amount" },
];
const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED"].map((v) => ({ value: v, label: v }));

const LIST_HREF = "/dashboard/promotions";
const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : "");

interface PromotionFormProps {
  /** Present ⇒ edit mode. */
  initial?: Promotion;
  /** Called after a successful save. Defaults to redirecting to the list. */
  onDone?: () => void;
  /** Called when the user cancels. Defaults to redirecting to the list. */
  onCancel?: () => void;
}

/**
 * PromotionForm — one validated form for both create and edit. Renders as a
 * full page (create route) or inside a drawer (row edit); the caller decides via
 * `onDone` / `onCancel`, which default to list navigation.
 */
export function PromotionForm({ initial, onDone, onCancel }: PromotionFormProps) {
  const router = useRouter();
  const create = useCreatePromotion();
  const update = useUpdatePromotion();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(promotionSchema, {
    defaultValues: {
      code: initial?.code ?? "",
      name: initial?.name ?? "",
      type: initial?.type ?? "Coupon",
      discountType: initial?.discountType ?? "percent",
      value: initial?.value ?? 10,
      currency: initial?.currency ?? "USD",
      status: initial?.status ?? "scheduled",
      startsAt: toDateInput(initial?.startsAt ?? ""),
      endsAt: toDateInput(initial?.endsAt ?? ""),
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
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-surface px-6 py-2"
    >
      {submitError && (
        <Alert tone="danger" title="Couldn't save promotion" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Details" description="Name, code and campaign type.">
        <FormGrid cols={2}>
          <Input
            label="Name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Code"
            required
            className="font-mono uppercase"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            {...form.register("type")}
            error={form.formState.errors.type?.message}
          />
          <Select
            label="Status"
            options={statusOptions(PROMOTION_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Discount" description="How much the promotion takes off.">
        <FormGrid cols={3}>
          <Select
            label="Discount type"
            options={DISCOUNT_TYPE_OPTIONS}
            {...form.register("discountType")}
            error={form.formState.errors.discountType?.message}
          />
          <Input
            label="Value"
            type="number"
            min={0}
            step="0.01"
            {...form.register("value")}
            error={form.formState.errors.value?.message}
          />
          <Select
            label="Currency"
            options={CURRENCY_OPTIONS}
            {...form.register("currency")}
            error={form.formState.errors.currency?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule" description="When the promotion runs.">
        <FormGrid cols={2}>
          <Input
            label="Starts"
            type="date"
            required
            {...form.register("startsAt")}
            error={form.formState.errors.startsAt?.message}
          />
          <Input
            label="Ends"
            type="date"
            required
            {...form.register("endsAt")}
            error={form.formState.errors.endsAt?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={cancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Create promotion"}
        </Button>
      </FormActions>
    </form>
  );
}
