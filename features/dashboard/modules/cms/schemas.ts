import { z } from "zod";
import { requiredString } from "../../schemas/common";

/**
 * CMS page form schema — serves both create and edit.
 *
 * Status is deliberately absent: a page's state is changed by the workflow
 * actions (submit / approve / schedule / restore), never by typing into a
 * dropdown, so there is no way to publish something that skipped review.
 */
export const cmsPageSchema = z.object({
  title: requiredString,
  slug: requiredString
    .transform((v) => v.toLowerCase().replace(/^\/+/, "").replace(/\s+/g, "-"))
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9-]+(\/[a-z0-9-]+)*$/, "Letters, numbers, hyphens and / only"),
    ),
  type: requiredString,
  author: requiredString,
  excerpt: z.string().trim().max(200, "Keep the summary under 200 characters"),
  body: z.string().trim().min(20, "Write at least a paragraph"),
});

export type CmsPageFormValues = z.infer<typeof cmsPageSchema>;
