import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { ACTIVITY_CATEGORIES, ACTIVITY_STATUS_VALUES } from "./types";

/** Activity form schema — serves both create and edit. */
export const activitySchema = z.object({
  name: requiredString,
  city: requiredString,
  country: requiredString,
  category: z.enum(ACTIVITY_CATEGORIES),
  durationHours: z.coerce.number().min(0, "Can't be negative"),
  price: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  capacity: z.coerce.number().int().min(0, "Can't be negative"),
  status: z.enum(ACTIVITY_STATUS_VALUES),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;
