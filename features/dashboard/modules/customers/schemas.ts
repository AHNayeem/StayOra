import { z } from "zod";
import { emailSchema, requiredString } from "../../schemas/common";
import { CUSTOMER_STATUS_VALUES } from "./types";

/**
 * Customer form schema — serves both create and edit. Aggregate metrics
 * (bookings, spend) are derived server-side, so they're not part of the form.
 */
export const customerSchema = z.object({
  name: requiredString,
  email: emailSchema,
  phone: requiredString,
  country: requiredString,
  status: z.enum(CUSTOMER_STATUS_VALUES),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
