import { z } from "zod";
import { requiredString } from "../../schemas/common";
import {
  BANNER_PLACEMENT_VALUES,
  BANNER_STATUS_VALUES,
  BANNER_THEME_VALUES,
} from "./types";

/**
 * Banner form schema — one schema for create and edit. The CTA target must be a
 * root-relative path or an absolute URL, and the run window must move forwards.
 * Business rules live here rather than in the component.
 */
export const bannerSchema = z
  .object({
    title: requiredString.pipe(z.string().max(80, "Keep the title under 80 characters")),
    subtitle: z.string().trim().max(140, "Keep the subtitle under 140 characters").default(""),
    ctaLabel: requiredString.pipe(z.string().max(24, "Keep the label short")),
    ctaHref: requiredString.refine(
      (v) => v.startsWith("/") || /^https?:\/\//.test(v),
      "Use a path like /offers or a full https:// URL",
    ),
    placement: z.enum(BANNER_PLACEMENT_VALUES),
    theme: z.enum(BANNER_THEME_VALUES),
    status: z.enum(BANNER_STATUS_VALUES),
    priority: z.coerce.number().int("Whole numbers only").min(1, "Minimum is 1").max(99),
    startsAt: requiredString,
    endsAt: requiredString,
  })
  .refine((d) => d.endsAt >= d.startsAt, {
    message: "End date must be after the start date",
    path: ["endsAt"],
  });

export type BannerFormValues = z.infer<typeof bannerSchema>;
