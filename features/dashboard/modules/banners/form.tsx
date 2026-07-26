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
  Textarea,
} from "../../ui";
import { statusOptions } from "../../lib/status";
import { bannerSchema } from "./schemas";
import { useCreateBanner, useUpdateBanner } from "./hooks";
import {
  BANNER_PLACEMENTS,
  BANNER_STATUSES,
  BANNER_THEMES,
  type Banner,
} from "./types";

const LIST_HREF = "/dashboard/promotions/banners";
const toDateInput = (iso: string) => (iso ? iso.slice(0, 10) : "");

interface BannerFormProps {
  /** Present ⇒ edit mode. */
  initial?: Banner;
  /** Called after a successful save. Defaults to redirecting to the list. */
  onDone?: () => void;
  /** Called when the user cancels. Defaults to redirecting to the list. */
  onCancel?: () => void;
}

/**
 * BannerForm — one validated form for both create and edit. Renders as a full
 * page (create route) or inside a drawer (row edit); the caller decides via
 * `onDone` / `onCancel`, which default to list navigation.
 */
export function BannerForm({ initial, onDone, onCancel }: BannerFormProps) {
  const router = useRouter();
  const create = useCreateBanner();
  const update = useUpdateBanner();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(bannerSchema, {
    defaultValues: {
      title: initial?.title ?? "",
      subtitle: initial?.subtitle ?? "",
      ctaLabel: initial?.ctaLabel ?? "Shop now",
      ctaHref: initial?.ctaHref ?? "/offers",
      placement: initial?.placement ?? "home_hero",
      theme: initial?.theme ?? "brand",
      status: initial?.status ?? "scheduled",
      priority: initial?.priority ?? 1,
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
        <Alert tone="danger" title="Couldn't save banner" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Content" description="The headline, supporting line and call to action.">
        <FormGrid cols={1}>
          <Input
            label="Title"
            required
            {...form.register("title")}
            error={form.formState.errors.title?.message}
          />
          <Textarea
            label="Subtitle"
            rows={2}
            hint="Optional supporting line shown beneath the title."
            {...form.register("subtitle")}
            error={form.formState.errors.subtitle?.message}
          />
        </FormGrid>
        <FormGrid cols={2}>
          <Input
            label="Button label"
            required
            {...form.register("ctaLabel")}
            error={form.formState.errors.ctaLabel?.message}
          />
          <Input
            label="Button link"
            required
            placeholder="/offers"
            className="font-mono"
            {...form.register("ctaHref")}
            error={form.formState.errors.ctaHref?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Placement" description="Where the banner appears and how it looks.">
        <FormGrid cols={3}>
          <Select
            label="Placement"
            options={statusOptions(BANNER_PLACEMENTS)}
            {...form.register("placement")}
            error={form.formState.errors.placement?.message}
          />
          <Select
            label="Theme"
            options={statusOptions(BANNER_THEMES)}
            {...form.register("theme")}
            error={form.formState.errors.theme?.message}
          />
          <Input
            label="Priority"
            type="number"
            min={1}
            max={99}
            hint="Lower shows first."
            {...form.register("priority")}
            error={form.formState.errors.priority?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule" description="When the banner runs.">
        <FormGrid cols={3}>
          <Select
            label="Status"
            options={statusOptions(BANNER_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
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
          {isEdit ? "Save changes" : "Create banner"}
        </Button>
      </FormActions>
    </form>
  );
}
