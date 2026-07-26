import { z } from "zod";
import { requiredString } from "../../schemas/common";
import {
  TAX_CATEGORY_VALUES,
  TAX_STATUS_VALUES,
  TAX_TYPE_VALUES,
} from "./types";

/** Tax rule form schema — serves both create and edit. */
export const taxSchema = z.object({
  name: requiredString,
  region: requiredString,
  category: z.enum(TAX_CATEGORY_VALUES),
  rate: z.coerce
    .number()
    .min(0, "Can't be negative")
    .max(100, "Can't exceed 100%"),
  type: z.enum(TAX_TYPE_VALUES),
  status: z.enum(TAX_STATUS_VALUES),
});

export type TaxFormValues = z.infer<typeof taxSchema>;
