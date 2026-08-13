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
  Textarea,
} from "../../ui";
import { cmsPageSchema } from "./schemas";
import { useCreateCmsPage, useUpdateCmsPage } from "./hooks";
import type { CmsPage } from "./types";

const TYPE_OPTIONS = ["Page", "Blog Post", "FAQ", "Legal", "Landing"].map((v) => ({
  value: v,
  label: v,
}));

interface CmsPageFormProps {
  /** Present ⇒ edit mode. */
  initial?: CmsPage;
  onDone: () => void;
  onCancel: () => void;
}

/** CmsPageForm — one validated form for both create and edit (drawer-hosted). */
export function CmsPageForm({ initial, onDone, onCancel }: CmsPageFormProps) {
  const create = useCreateCmsPage();
  const update = useUpdateCmsPage();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(cmsPageSchema, {
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      type: initial?.type ?? "Page",
      author: initial?.author ?? "",
      excerpt: initial?.excerpt ?? "",
      body: initial?.body ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, input: values, previous: initial });
      } else await create.mutateAsync(values);
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
        <Alert tone="danger" title="Couldn't save page" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Content" description="Title, URL slug and author.">
        <FormGrid cols={1}>
          <Input
            label="Title"
            required
            {...form.register("title")}
            error={form.formState.errors.title?.message}
          />
          <Input
            label="Slug"
            required
            hint="URL path, e.g. about-us"
            className="font-mono"
            {...form.register("slug")}
            error={form.formState.errors.slug?.message}
          />
          <Input
            label="Summary"
            hint="One line, shown in previews and search results"
            {...form.register("excerpt")}
            error={form.formState.errors.excerpt?.message}
          />
          <Textarea
            label="Body"
            required
            rows={8}
            hint="Separate paragraphs with a blank line"
            {...form.register("body")}
            error={form.formState.errors.body?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection
        title="Publishing"
        description={
          isEdit
            ? "Status is changed from Workflow & history, not here."
            : "New pages always start as a draft and go through review."
        }
      >
        <FormGrid cols={2}>
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            {...form.register("type")}
            error={form.formState.errors.type?.message}
          />
          <Input
            label="Author"
            required
            {...form.register("author")}
            error={form.formState.errors.author?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Create page"}
        </Button>
      </FormActions>
    </form>
  );
}
