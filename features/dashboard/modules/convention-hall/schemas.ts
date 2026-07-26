import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { CONVENTION_HALL_STATUS_VALUES } from "./types";

/** Convention hall form schema — serves both create and edit. */
export const conventionHallSchema = z.object({
  name: requiredString,
  city: requiredString,
  country: requiredString,
  capacity: z.coerce.number().int().min(0, "Can't be negative"),
  halls: z.coerce.number().int().min(0, "Can't be negative"),
  pricePerDay: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(CONVENTION_HALL_STATUS_VALUES),
});

export type ConventionHallFormValues = z.infer<typeof conventionHallSchema>;
