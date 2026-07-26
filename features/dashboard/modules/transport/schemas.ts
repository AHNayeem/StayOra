import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { TRANSPORT_STATUS_VALUES, TRANSPORT_TYPES } from "./types";

/** Transport form schema — serves both create and edit. */
export const transportSchema = z.object({
  name: requiredString,
  type: z.enum(TRANSPORT_TYPES),
  route: requiredString,
  seats: z.coerce.number().int().min(0, "Can't be negative"),
  pricePerTrip: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(TRANSPORT_STATUS_VALUES),
});

export type TransportFormValues = z.infer<typeof transportSchema>;
