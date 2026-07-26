"use client";

import { useState } from "react";
import { getErrorMessage } from "../../data";
import { useZodForm, applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  Checkbox,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
} from "../../ui";
import { statusOptions } from "../../lib/status";
import { menuItemSchema } from "./schemas";
import { useCreateMenuItem, useUpdateMenuItem } from "./hooks";
import { MENU_LOCATIONS, type MenuItem } from "./types";

interface MenuItemFormProps {
  /** Present ⇒ edit mode. */
  initial?: MenuItem;
  onDone: () => void;
  onCancel: () => void;
}

/** MenuItemForm — one validated form for both create and edit (drawer-hosted). */
export function MenuItemForm({ initial, onDone, onCancel }: MenuItemFormProps) {
  const create = useCreateMenuItem();
  const update = useUpdateMenuItem();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(menuItemSchema, {
    defaultValues: {
      label: initial?.label ?? "",
      location: initial?.location ?? "header",
      url: initial?.url ?? "",
      order: initial?.order ?? 0,
      visible: initial?.visible ?? true,
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
        <Alert tone="danger" title="Couldn't save menu item" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Link" description="Label shown to visitors and where it points.">
        <FormGrid cols={1}>
          <Input
            label="Label"
            required
            {...form.register("label")}
            error={form.formState.errors.label?.message}
          />
          <Input
            label="URL"
            required
            hint="Path like /hotels or an absolute URL"
            className="font-mono"
            {...form.register("url")}
            error={form.formState.errors.url?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Placement" description="Menu location and order.">
        <FormGrid cols={2}>
          <Select
            label="Location"
            options={statusOptions(MENU_LOCATIONS)}
            {...form.register("location")}
            error={form.formState.errors.location?.message}
          />
          <Input
            label="Order"
            type="number"
            min={0}
            hint="Lower numbers appear first"
            {...form.register("order")}
            error={form.formState.errors.order?.message}
          />
        </FormGrid>
        <div className="mt-4">
          <Checkbox label="Visible in navigation" {...form.register("visible")} />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Add menu item"}
        </Button>
      </FormActions>
    </form>
  );
}
