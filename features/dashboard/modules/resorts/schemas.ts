import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { RESORT_STATUS_VALUES } from "./types";

/** Resort form schema — serves both create and edit. */
export const resortSchema = z.object({
  name: requiredString,
  city: requiredString,
  country: requiredString,
  rooms: z.coerce.number().int().min(0, "Can't be negative"),
  rating: z.coerce.number().min(0, "Min 0").max(5, "Max 5"),
  pricePerNight: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(RESORT_STATUS_VALUES),
});

export type ResortFormValues = z.infer<typeof resortSchema>;
