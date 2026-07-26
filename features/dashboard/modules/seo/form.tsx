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
  Textarea,
} from "../../ui";
import { seoSchema } from "./schemas";
import { useCreateSeoEntry, useUpdateSeoEntry } from "./hooks";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, type SeoEntry } from "./types";

interface SeoFormProps {
  /** Present ⇒ edit mode. */
  initial?: SeoEntry;
  onDone: () => void;
  onCancel: () => void;
}

/** SeoForm — one validated form for both create and edit (drawer-hosted). */
export function SeoForm({ initial, onDone, onCancel }: SeoFormProps) {
  const create = useCreateSeoEntry();
  const update = useUpdateSeoEntry();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(seoSchema, {
    defaultValues: {
      path: initial?.path ?? "",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      canonical: initial?.canonical ?? "",
      ogImage: initial?.ogImage ?? "",
      indexable: initial?.indexable ?? true,
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
        <Alert tone="danger" title="Couldn't save SEO entry" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Route" description="Which page these tags apply to.">
        <FormGrid cols={1}>
          <Input
            label="Path"
            required
            hint="e.g. /hotels"
            className="font-mono"
            {...form.register("path")}
            error={form.formState.errors.path?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Meta tags"
        description={`Title ≤ ${SEO_TITLE_MAX} and description ≤ ${SEO_DESCRIPTION_MAX} characters read best in search results.`}
      >
        <FormGrid cols={1}>
          <Input
            label="Title"
            required
            {...form.register("title")}
            error={form.formState.errors.title?.message}
          />
          <Textarea
            label="Meta description"
            required
            rows={3}
            {...form.register("description")}
            error={form.formState.errors.description?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Advanced" description="Canonical, social image and indexing.">
        <FormGrid cols={1}>
          <Input
            label="Canonical URL"
            hint="Leave blank for self-referential"
            className="font-mono"
            {...form.register("canonical")}
            error={form.formState.errors.canonical?.message}
          />
          <Input
            label="Open Graph image"
            hint="Absolute URL or /path; blank uses the site default"
            className="font-mono"
            {...form.register("ogImage")}
            error={form.formState.errors.ogImage?.message}
          />
        </FormGrid>
        <div className="mt-4">
          <Checkbox
            label="Allow search engines to index this page"
            {...form.register("indexable")}
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Add SEO entry"}
        </Button>
      </FormActions>
    </form>
  );
}
