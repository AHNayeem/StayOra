import { z } from "zod";
import type { Destination, DestinationInput } from "@/types/destination";
import { DESTINATION_STATUS_VALUES } from "@/types/destination";
import { isValidSlug } from "@/features/destinations/slug";
import { requiredString } from "../../schemas/common";

/**
 * Destination form schema — one schema for create and edit.
 *
 * List fields (gallery, highlights, attractions, activities) are edited as
 * newline-separated text and validated as strings, matching how the rest of the
 * dashboard handles multi-value inputs; {@link toDestinationInput} converts them
 * to arrays on submit. Keeping the conversion here rather than in the component
 * means the form has no data-shaping logic in it at all.
 *
 * Slug rules live here too: the field may be left blank (the store derives one
 * from the name) but anything typed has to be a real slug. *Uniqueness* is not
 * checkable in a schema — the store owns that and returns a field error.
 */
export const destinationSchema = z.object({
  name: requiredString.pipe(z.string().max(60, "Keep the name under 60 characters")),
  country: requiredString.pipe(z.string().max(60, "Keep the country under 60 characters")),
  region: z.string().trim().max(60, "Keep the region under 60 characters").default(""),
  slug: z
    .string()
    .trim()
    .default("")
    .refine(
      (value) => value === "" || isValidSlug(value),
      "Use lowercase letters, numbers and hyphens only — e.g. new-york-city",
    ),
  shortDescription: z
    .string()
    .trim()
    .max(180, "Keep the summary under 180 characters")
    .default(""),
  description: requiredString.pipe(
    z.string().min(40, "Write at least a couple of sentences travellers can use"),
  ),
  image: requiredString.refine(
    (value) => /^https?:\/\/\S+$/.test(value),
    "Use a full https:// image URL",
  ),
  /** One URL per line. */
  gallery: z.string().default(""),
  /** One per line. */
  highlights: z.string().default(""),
  attractions: z.string().default(""),
  activities: z.string().default(""),
  featured: z.boolean().default(false),
  status: z.enum(DESTINATION_STATUS_VALUES),
  seoTitle: z.string().trim().max(70, "Search engines truncate past ~70 characters").default(""),
  seoDescription: z
    .string()
    .trim()
    .max(180, "Search engines truncate past ~180 characters")
    .default(""),
});

export type DestinationFormValues = z.infer<typeof destinationSchema>;

/** Split a newline/comma separated textarea into clean, de-duplicated values. */
function toList(value: string): string[] {
  const seen = new Set<string>();
  for (const raw of value.split(/[\n,]/)) {
    const item = raw.trim();
    if (item) seen.add(item);
  }
  return [...seen];
}

const joinList = (values: string[] | undefined): string => (values ?? []).join("\n");

/** Form values → the shape the destination store stores. */
export function toDestinationInput(values: DestinationFormValues): DestinationInput {
  const gallery = toList(values.gallery);
  const highlights = toList(values.highlights);
  const attractions = toList(values.attractions);
  const activities = toList(values.activities);

  return {
    name: values.name,
    country: values.country,
    region: values.region || undefined,
    // Blank means "derive it from the name" — the store owns slug generation.
    slug: values.slug,
    description: values.description,
    shortDescription: values.shortDescription || undefined,
    image: values.image,
    gallery: gallery.length > 0 ? gallery : undefined,
    status: values.status,
    featured: values.featured,
    highlights: highlights.length > 0 ? highlights : undefined,
    attractions: attractions.length > 0 ? attractions : undefined,
    activities: activities.length > 0 ? activities : undefined,
    metadata:
      values.seoTitle || values.seoDescription
        ? {
            seoTitle: values.seoTitle || undefined,
            seoDescription: values.seoDescription || undefined,
          }
        : undefined,
  };
}

/** A stored destination → form values, for the edit screen. */
export function toDestinationFormValues(
  destination?: Destination,
): DestinationFormValues {
  return {
    name: destination?.name ?? "",
    country: destination?.country ?? "",
    region: destination?.region ?? "",
    slug: destination?.slug ?? "",
    shortDescription: destination?.shortDescription ?? "",
    description: destination?.description ?? "",
    image: destination?.image ?? "",
    gallery: joinList(destination?.gallery),
    highlights: joinList(destination?.highlights),
    attractions: joinList(destination?.attractions),
    activities: joinList(destination?.activities),
    featured: destination?.featured ?? false,
    status: destination?.status ?? "draft",
    seoTitle: destination?.metadata?.seoTitle ?? "",
    seoDescription: destination?.metadata?.seoDescription ?? "",
  };
}
