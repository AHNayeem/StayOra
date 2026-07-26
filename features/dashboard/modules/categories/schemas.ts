import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { CATEGORY_GROUP_VALUES, CATEGORY_STATUS_VALUES } from "./types";

/** Category form schema — serves both create and edit. */
export const categorySchema = z.object({
  name: requiredString,
  slug: requiredString,
  group: z.enum(CATEGORY_GROUP_VALUES),
  itemsCount: z.coerce.number().int().min(0, "Can't be negative"),
  status: z.enum(CATEGORY_STATUS_VALUES),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
