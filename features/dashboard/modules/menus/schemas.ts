import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { MENU_LOCATION_VALUES } from "./types";

/** Menu item form schema — serves both create and edit. */
export const menuItemSchema = z.object({
  label: requiredString,
  location: z.enum(MENU_LOCATION_VALUES),
  url: requiredString.transform((v) => v.trim()),
  order: z.coerce.number().int().min(0, "Must be 0 or more"),
  visible: z.coerce.boolean().default(true),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;
