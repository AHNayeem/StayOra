import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { PROMOTION_STATUS_VALUES } from "./types";

/**
 * Promotion form schema — serves both create and edit. Percentage discounts are
 * capped at 100; the window must be a forward date range. Business rules live
 * here, not in the component.
 */
export const promotionSchema = z
  .object({
    code: requiredString.transform((v) => v.toUpperCase()),
    name: requiredString,
    type: requiredString,
    discountType: z.enum(["percent", "fixed"]),
    value: z.coerce.number().min(0, "Can't be negative"),
    currency: requiredString,
    status: z.enum(PROMOTION_STATUS_VALUES),
    startsAt: requiredString,
    endsAt: requiredString,
  })
  .refine((d) => d.discountType !== "percent" || d.value <= 100, {
    message: "A percentage can't exceed 100",
    path: ["value"],
  })
  .refine((d) => d.endsAt >= d.startsAt, {
    message: "End date must be after the start date",
    path: ["endsAt"],
  });

export type PromotionFormValues = z.infer<typeof promotionSchema>;
