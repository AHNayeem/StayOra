import { z } from "zod";
import { requiredString } from "../../schemas/common";
import {
  TAX_BASIS_VALUES,
  TAX_CATEGORY_VALUES,
  TAX_STATUS_VALUES,
  TAX_TYPE_VALUES,
} from "./types";

/**
 * Tax rule form schema — serves both create and edit.
 *
 * `rate` and `amount` are both collected; the basis decides which one is read,
 * and the refinement below stops a rule being saved with nothing to charge.
 */
export const taxSchema = z
  .object({
    name: requiredString,
    region: requiredString,
    category: z.enum(TAX_CATEGORY_VALUES),
    basis: z.enum(TAX_BASIS_VALUES),
    rate: z.coerce
      .number()
      .min(0, "Can't be negative")
      .max(100, "Can't exceed 100%"),
    amount: z.coerce.number().min(0, "Can't be negative"),
    type: z.enum(TAX_TYPE_VALUES),
    priority: z.coerce
      .number()
      .int("Whole numbers only")
      .min(0, "Can't be negative")
      .max(999, "Keep it under 1000"),
    status: z.enum(TAX_STATUS_VALUES),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().optional(),
  })
  .refine(
    (v) =>
      v.basis === "net_sale" || v.basis === "service_fee" ? v.rate > 0 : v.amount > 0,
    {
      message: "A rule has to charge something — set a rate or an amount.",
      path: ["rate"],
    },
  )
  .refine((v) => !v.effectiveFrom || !v.effectiveTo || v.effectiveTo >= v.effectiveFrom, {
    message: "The end date can't be before the start date.",
    path: ["effectiveTo"],
  });

export type TaxFormValues = z.infer<typeof taxSchema>;
