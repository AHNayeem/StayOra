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
import { attributeSchema } from "./schemas";
import { useCreateAttribute, useUpdateAttribute } from "./hooks";
import {
  ATTRIBUTE_INPUT_TYPE_VALUES,
  ATTRIBUTE_STATUSES,
  type Attribute,
} from "./types";

const INPUT_TYPE_OPTIONS = ATTRIBUTE_INPUT_TYPE_VALUES.map((v) => ({
  value: v,
  label: v,
}));

interface AttributeFormProps {
  /** Present ⇒ edit mode. */
  initial?: Attribute;
  onDone: () => void;
  onCancel: () => void;
}

/** AttributeForm — one validated form for both create and edit (drawer-hosted). */
export function AttributeForm({ initial, onDone, onCancel }: AttributeFormProps) {
  const create = useCreateAttribute();
  const update = useUpdateAttribute();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(attributeSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      group: initial?.group ?? "",
      inputType: initial?.inputType ?? "select",
      valuesCount: initial?.valuesCount ?? 0,
      status: initial?.status ?? "enabled",
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
        <Alert tone="danger" title="Couldn't save attribute" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Attribute" description="Name and grouping.">
        <FormGrid cols={2}>
          <Input
            label="Attribute name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Group"
            required
            {...form.register("group")}
            error={form.formState.errors.group?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Configuration" description="Input type, values and status.">
        <FormGrid cols={3}>
          <Select
            label="Input type"
            options={INPUT_TYPE_OPTIONS}
            {...form.register("inputType")}
            error={form.formState.errors.inputType?.message}
          />
          <Input
            label="Values"
            type="number"
            min={0}
            {...form.register("valuesCount")}
            error={form.formState.errors.valuesCount?.message}
          />
          <Select
            label="Status"
            options={statusOptions(ATTRIBUTE_STATUSES)}
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
          {isEdit ? "Save changes" : "Add attribute"}
        </Button>
      </FormActions>
    </form>
  );
}
