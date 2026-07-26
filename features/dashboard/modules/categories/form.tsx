"use client";

import { useState } from "react";
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
import { categorySchema } from "./schemas";
import { useCreateCategory, useUpdateCategory } from "./hooks";
import {
  CATEGORY_GROUP_VALUES,
  CATEGORY_STATUSES,
  type Category,
} from "./types";

const GROUP_OPTIONS = CATEGORY_GROUP_VALUES.map((v) => ({ value: v, label: v }));

interface CategoryFormProps {
  /** Present ⇒ edit mode. */
  initial?: Category;
  onDone: () => void;
  onCancel: () => void;
}

/** CategoryForm — one validated form for both create and edit (drawer-hosted). */
export function CategoryForm({ initial, onDone, onCancel }: CategoryFormProps) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(categorySchema, {
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      group: initial?.group ?? "Stays",
      itemsCount: initial?.itemsCount ?? 0,
      status: initial?.status ?? "active",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
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
        <Alert tone="danger" title="Couldn't save category" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Category" description="Name and URL slug.">
        <FormGrid cols={1}>
          <Input
            label="Category name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Slug"
            required
            hint="URL-friendly key, e.g. beach-resorts"
            className="font-mono"
            {...form.register("slug")}
            error={form.formState.errors.slug?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Taxonomy" description="Group, item count and status.">
        <FormGrid cols={3}>
          <Select
            label="Group"
            options={GROUP_OPTIONS}
            {...form.register("group")}
            error={form.formState.errors.group?.message}
          />
          <Input
            label="Items"
            type="number"
            min={0}
            {...form.register("itemsCount")}
            error={form.formState.errors.itemsCount?.message}
          />
          <Select
            label="Status"
            options={statusOptions(CATEGORY_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Add category"}
        </Button>
      </FormActions>
    </form>
  );
}
