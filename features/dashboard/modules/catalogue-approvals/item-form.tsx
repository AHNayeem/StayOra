"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "@/lib/toast";
import { VERTICAL_LABELS } from "@/types/booking";
import {
  planFor,
  type CatalogueItem,
  type Merchant,
} from "@/features/dashboard/domain";
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
import { useCreateCatalogueItem, useUpdateCatalogueItem } from "./hooks";

/**
 * Listing validation.
 *
 * These are the same rules the domain's `catalogueSubmissionProblems` enforces
 * on submit, stated here as a schema so the merchant sees them inline rather
 * than discovering them when the submission is rejected.
 */
const itemSchema = z.object({
  title: z.string().trim().min(4, "Give the listing a title of at least 4 characters."),
  vertical: z.string().min(1, "Choose a product type."),
  propertyId: z.string().optional(),
  summary: z.string().trim().min(20, "Write a description of at least 20 characters."),
  city: z.string().trim().min(2, "Enter the city."),
  country: z.string().trim().min(2, "Enter the country."),
  basePrice: z.coerce.number().positive("Set a price above zero."),
  image: z.union([z.string().trim().url("Enter a full image URL."), z.literal("")]).optional(),
});

type ItemValues = z.infer<typeof itemSchema>;

export function CatalogueItemForm({
  merchant,
  item,
  onDone,
  onCancel,
}: {
  merchant: Merchant;
  item?: CatalogueItem;
  onDone: () => void;
  onCancel: () => void;
}) {
  const create = useCreateCatalogueItem();
  const update = useUpdateCatalogueItem();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(itemSchema, {
    defaultValues: {
      title: item?.title ?? "",
      vertical: item?.vertical ?? merchant.verticals[0] ?? "hotels",
      propertyId: item?.propertyId ?? "",
      summary: item?.summary ?? "",
      city: item?.city ?? merchant.city,
      country: item?.country ?? merchant.country,
      basePrice: item?.basePrice ?? 100,
      image: item?.image ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values: ItemValues) => {
    setSubmitError(null);
    const payload = {
      title: values.title,
      vertical: values.vertical as Merchant["verticals"][number],
      propertyId: values.propertyId || undefined,
      summary: values.summary,
      city: values.city,
      country: values.country,
      basePrice: values.basePrice,
      image: values.image || undefined,
    };
    try {
      if (item) {
        await update.mutateAsync({ id: item.id, input: payload });
        toast.saved("Listing");
      } else {
        await create.mutateAsync({ merchantId: merchant.id, input: payload });
        toast.success("Draft created", { description: "Submit it when you're ready for review." });
      }
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  const plan = planFor(merchant);

  return (
    <form onSubmit={onSubmit} noValidate className="px-1">
      {submitError && (
        <Alert tone="danger" title="Couldn't save the listing" className="mb-4">
          {submitError}
        </Alert>
      )}

      {item?.status === "published" && (
        <Alert tone="warning" title="This listing is live" className="mb-4">
          Saving takes it down and it will need to be resubmitted, so customers never see a change
          that hasn&apos;t been reviewed.
        </Alert>
      )}

      <FormSection title="Product" description={`Your ${plan.name} plan allows ${plan.limits.listings === -1 ? "unlimited" : plan.limits.listings} listings.`}>
        <FormGrid cols={2}>
          <Input
            label="Title"
            required
            {...form.register("title")}
            error={form.formState.errors.title?.message}
          />
          <Select
            label="Product type"
            required
            options={merchant.verticals.map((v) => ({ value: v, label: VERTICAL_LABELS[v] }))}
            {...form.register("vertical")}
            error={form.formState.errors.vertical?.message}
          />
          {merchant.properties.length > 0 && (
            <Select
              label="Property"
              options={[
                { value: "", label: "Not linked to a property" },
                ...merchant.properties.map((p) => ({ value: p.id, label: p.name })),
              ]}
              {...form.register("propertyId")}
              error={form.formState.errors.propertyId?.message}
            />
          )}
          <Input
            label="Price from (USD)"
            type="number"
            min={1}
            step={1}
            required
            {...form.register("basePrice")}
            error={form.formState.errors.basePrice?.message}
          />
          <Input
            label="City"
            required
            {...form.register("city")}
            error={form.formState.errors.city?.message}
          />
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
          <Input
            label="Cover image URL"
            placeholder="https://"
            {...form.register("image")}
            error={form.formState.errors.image?.message}
            hint="Leave blank to use a placeholder — no upload is available in this prototype."
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Description" description="What a traveller reads before booking.">
        <Textarea
          label="Description"
          rows={4}
          required
          {...form.register("summary")}
          error={form.formState.errors.summary?.message}
        />
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {item ? "Save changes" : "Create draft"}
        </Button>
      </FormActions>
    </form>
  );
}
