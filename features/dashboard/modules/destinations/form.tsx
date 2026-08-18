"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Wand2 } from "lucide-react";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Button,
  buttonVariants,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Switch,
  Textarea,
} from "../../ui";
import { statusOptions } from "../../lib/status";
import { destinationHref } from "@/features/destinations/links";
import { slugify } from "@/features/destinations/slug";
import { suggestDestinationSlug } from "@/features/destinations/service";
import { toast } from "@/lib/toast";
import { useCreateDestination, useUpdateDestination } from "./hooks";
import {
  destinationSchema,
  toDestinationFormValues,
  toDestinationInput,
} from "./schemas";
import { DESTINATION_STATUSES, type Destination } from "./types";

interface DestinationFormProps {
  /** Present ⇒ edit mode. */
  initial?: Destination;
}

/**
 * Create / edit a destination.
 *
 * One form serves both, because "preserve unchanged fields" is far easier to get
 * right when edit is the same code path as create: the form is loaded from the
 * stored record, and whatever comes back out is what gets written.
 *
 * The slug field is the part worth reading. It is suggested from the name (and
 * kept in step while the editor hasn't touched it), normalised on blur so a typed
 * value can't be un-routable, and checked for uniqueness by the store — which
 * returns a field error rather than quietly taking over an existing URL.
 */
export function DestinationForm({ initial }: DestinationFormProps) {
  const router = useRouter();
  const create = useCreateDestination();
  const update = useUpdateDestination();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(destinationSchema, {
    defaultValues: toDestinationFormValues(initial),
  });

  const name = form.watch("name");
  const slug = form.watch("slug");

  /**
   * Offer a slug for the current name.
   *
   * Only auto-fills while the slug is empty: once an editor has set one, the URL
   * is a decision and renaming the destination must not silently move its page.
   */
  const suggestSlug = (nextName: string) => {
    if (form.getFieldState("slug").isDirty || form.getValues("slug")) return;
    const suggestion = suggestDestinationSlug(nextName, initial?.id);
    if (suggestion) form.setValue("slug", suggestion, { shouldValidate: false });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    const input = toDestinationInput(values);
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, input });
        toast.success(`${input.name} saved`);
      } else {
        const created = await create.mutateAsync(input);
        toast.success(
          created.status === "published"
            ? `${created.name} is live at /destinations/${created.slug}`
            : `${created.name} saved as a draft`,
        );
      }
      router.push("/dashboard/destinations");
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/destinations"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All destinations
        </Link>
        {initial?.status === "published" && (
          <Link
            href={destinationHref(initial)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View public page
          </Link>
        )}
      </div>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        {submitError && (
          <Alert tone="danger" title="Couldn't save this destination" className="my-4">
            {submitError}
          </Alert>
        )}

        <FormSection title="Place" description="What and where this destination is.">
          <FormGrid cols={3}>
            <Input
              label="Name"
              required
              hint="How it appears on cards and headings"
              {...form.register("name", {
                onBlur: (event) => suggestSlug(event.target.value),
              })}
              error={errors.name?.message}
            />
            <Input
              label="Country"
              required
              {...form.register("country")}
              error={errors.country?.message}
            />
            <Input
              label="Region"
              hint="Optional — e.g. South Aegean"
              {...form.register("region")}
              error={errors.region?.message}
            />
          </FormGrid>

          <FormGrid cols={1}>
            <Input
              label="URL slug"
              required
              hint={`Public address: /destinations/${slugify(slug || name) || "…"}`}
              {...form.register("slug", {
                // Normalising on blur means an editor can paste anything and
                // still end up with a URL the router matches.
                onBlur: (event) =>
                  form.setValue("slug", slugify(event.target.value), {
                    shouldValidate: true,
                  }),
              })}
              error={errors.slug?.message}
              rightIcon={
                <button
                  type="button"
                  onClick={() =>
                    form.setValue(
                      "slug",
                      suggestDestinationSlug(form.getValues("name"), initial?.id),
                      { shouldValidate: true, shouldDirty: true },
                    )
                  }
                  className="text-muted transition-colors hover:text-primary"
                  aria-label="Suggest a slug from the name"
                  title="Suggest a slug from the name"
                >
                  <Wand2 className="size-4" aria-hidden="true" />
                </button>
              }
            />
          </FormGrid>
        </FormSection>

        <FormSection title="Content" description="The copy travellers read on the page.">
          <FormGrid cols={1}>
            <Textarea
              label="Short description"
              rows={2}
              hint="One line, used on cards and as the search-result summary"
              {...form.register("shortDescription")}
              error={errors.shortDescription?.message}
            />
            <Textarea
              label="Full description"
              required
              rows={8}
              hint="Blank lines separate paragraphs"
              {...form.register("description")}
              error={errors.description?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Imagery"
          description="Hero image and gallery. Paste image URLs — one per line for the gallery."
        >
          <FormGrid cols={1}>
            <Input
              label="Hero image URL"
              required
              placeholder="https://images.unsplash.com/photo-…"
              {...form.register("image")}
              error={errors.image?.message}
            />
            <Textarea
              label="Gallery image URLs"
              rows={4}
              hint="One URL per line. The hero leads the gallery automatically."
              {...form.register("gallery")}
              error={errors.gallery?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Highlights & things to do"
          description="One item per line. These render as the page's lists."
        >
          <FormGrid cols={1}>
            <Textarea
              label="Highlights"
              rows={3}
              hint="Why go — e.g. “World-class surf on the west coast”"
              {...form.register("highlights")}
              error={errors.highlights?.message}
            />
            <Textarea
              label="Popular attractions"
              rows={3}
              {...form.register("attractions")}
              error={errors.attractions?.message}
            />
            <Textarea
              label="Activities"
              rows={3}
              {...form.register("activities")}
              error={errors.activities?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Publishing"
          description="Drafts and archived destinations never appear on the public site."
        >
          <FormGrid cols={2}>
            <Select
              label="Status"
              options={statusOptions(DESTINATION_STATUSES)}
              {...form.register("status")}
              error={errors.status?.message}
            />
            <Switch
              label="Featured"
              hint="Promote on the home page and in the featured band"
              {...form.register("featured")}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Search engines"
          description="Both fall back to the destination's own copy when left blank."
        >
          <FormGrid cols={1}>
            <Input
              label="SEO title"
              hint="e.g. Bali Travel Guide & Stays"
              {...form.register("seoTitle")}
              error={errors.seoTitle?.message}
            />
            <Textarea
              label="SEO description"
              rows={2}
              {...form.register("seoDescription")}
              error={errors.seoDescription?.message}
            />
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/destinations")}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={pending}>
            {isEdit ? "Save changes" : "Create destination"}
          </Button>
        </FormActions>
      </div>
    </form>
  );
}
