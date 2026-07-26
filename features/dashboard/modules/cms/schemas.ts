import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { CMS_STATUS_VALUES } from "./types";

/** CMS page form schema — serves both create and edit. */
export const cmsPageSchema = z.object({
  title: requiredString,
  slug: requiredString
    .transform((v) => v.toLowerCase().replace(/^\/+/, "").replace(/\s+/g, "-"))
    .pipe(z.string().regex(/^[a-z0-9-]+$/, "Letters, numbers and hyphens only")),
  type: requiredString,
  author: requiredString,
  status: z.enum(CMS_STATUS_VALUES),
});

export type CmsPageFormValues = z.infer<typeof cmsPageSchema>;
