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
import { mediaSchema } from "./schemas";
import { useUploadMedia } from "./hooks";
import { MEDIA_TYPES } from "./types";

interface MediaFormProps {
  onDone: () => void;
  onCancel: () => void;
}

/**
 * MediaForm — records a new asset's metadata. Stands in for a real upload:
 * the file picker/transfer is out of scope for the prototype, so the seam is
 * the create mutation that a real uploader would call once the file lands.
 */
export function MediaForm({ onDone, onCancel }: MediaFormProps) {
  const upload = useUploadMedia();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(mediaSchema, {
    defaultValues: {
      name: "",
      type: "image",
      folder: "",
      dimensions: "",
      sizeKb: 0,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await upload.mutateAsync(values);
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
        <Alert tone="danger" title="Couldn't add asset" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="File" description="Filename and where it lives.">
        <FormGrid cols={1}>
          <Input
            label="File name"
            required
            hint="Include the extension, e.g. hero-banner.jpg"
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Folder"
            required
            hint="Lowercase collection, e.g. banners"
            className="font-mono"
            {...form.register("folder")}
            error={form.formState.errors.folder?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Metadata" description="Type, dimensions and size.">
        <FormGrid cols={3}>
          <Select
            label="Type"
            options={statusOptions(MEDIA_TYPES)}
            {...form.register("type")}
            error={form.formState.errors.type?.message}
          />
          <Input
            label="Dimensions"
            hint="e.g. 1920×1080"
            {...form.register("dimensions")}
            error={form.formState.errors.dimensions?.message}
          />
          <Input
            label="Size (KB)"
            type="number"
            min={0}
            {...form.register("sizeKb")}
            error={form.formState.errors.sizeKb?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={upload.isPending}>
          Add asset
        </Button>
      </FormActions>
    </form>
  );
}
