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
  Textarea,
} from "../../ui";
import { labelMap } from "../../lib/status";
import { templateSchema } from "./schemas";
import { useCreateTemplate, useUpdateTemplate } from "./hooks";
import { TEMPLATE_CHANNELS, TEMPLATE_CHANNEL_VALUES, type NotificationTemplate } from "./types";

const channelLabel = labelMap(TEMPLATE_CHANNELS);
const CHANNEL_OPTIONS = TEMPLATE_CHANNEL_VALUES.map((v) => ({
  value: v,
  label: channelLabel[v],
}));

interface TemplateFormProps {
  /** Present ⇒ edit mode. */
  initial?: NotificationTemplate;
  onDone: () => void;
  onCancel: () => void;
}

/** TemplateForm — validated create/edit for a notification template (drawer-hosted). */
export function TemplateForm({ initial, onDone, onCancel }: TemplateFormProps) {
  const create = useCreateTemplate();
  const update = useUpdateTemplate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(templateSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      key: initial?.key ?? "",
      channel: initial?.channel ?? "email",
      subject: initial?.subject ?? "",
      body: initial?.body ?? "",
      description: initial?.description ?? "",
      enabled: initial?.enabled ?? true,
    },
  });

  const channel = form.watch("channel");

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
        <Alert tone="danger" title="Couldn't save template" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Template" description="What this message is and when it fires.">
        <FormGrid cols={2}>
          <Input
            label="Name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Event key"
            required
            hint="e.g. booking.confirmed"
            className="font-mono"
            {...form.register("key")}
            error={form.formState.errors.key?.message}
          />
          <Select
            label="Channel"
            required
            options={CHANNEL_OPTIONS}
            {...form.register("channel")}
            error={form.formState.errors.channel?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Content"
        description="Use {{variables}} for personalisation — they're filled at send time."
      >
        <FormGrid cols={1}>
          {channel === "email" && (
            <Input
              label="Subject"
              required
              {...form.register("subject")}
              error={form.formState.errors.subject?.message}
            />
          )}
          <Textarea
            label={channel === "email" ? "Body" : "Message"}
            required
            rows={channel === "email" ? 8 : 4}
            {...form.register("body")}
            error={form.formState.errors.body?.message}
          />
          <Textarea
            label="Internal note"
            hint="Only shown to admins — not sent."
            rows={2}
            {...form.register("description")}
            error={form.formState.errors.description?.message}
          />
        </FormGrid>
        <div className="mt-4">
          <Checkbox label="Active — send this template" {...form.register("enabled")} />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Add template"}
        </Button>
      </FormActions>
    </form>
  );
}
