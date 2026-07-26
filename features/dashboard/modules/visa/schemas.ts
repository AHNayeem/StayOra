import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { VISA_STATUS_VALUES, VISA_TYPES } from "./types";

/** Visa service form schema — serves both create and edit. */
export const visaSchema = z.object({
  country: requiredString,
  type: z.enum(VISA_TYPES),
  processingDays: z.coerce.number().int().min(0, "Can't be negative"),
  fee: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(VISA_STATUS_VALUES),
});

export type VisaFormValues = z.infer<typeof visaSchema>;
