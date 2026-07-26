import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "./types";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((v) => v === "" || /^https?:\/\/|^\//.test(v), "Enter a URL or path");

/** SEO entry form schema — serves both create and edit. */
export const seoSchema = z.object({
  path: requiredString
    .transform((v) => {
      const t = v.trim();
      return t.startsWith("/") ? t : `/${t}`;
    })
    .pipe(z.string().regex(/^\/[\w\-/]*$/, "Path like /hotels")),
  title: requiredString.pipe(
    z.string().max(70, `Keep under ${SEO_TITLE_MAX + 10} characters`),
  ),
  description: requiredString.pipe(
    z.string().max(200, `Keep under ${SEO_DESCRIPTION_MAX + 40} characters`),
  ),
  canonical: optionalUrl,
  ogImage: optionalUrl,
  indexable: z.coerce.boolean().default(true),
});

export type SeoFormValues = z.infer<typeof seoSchema>;
