import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { APARTMENT_STATUS_VALUES } from "./types";

/** Apartment form schema — serves both create and edit. */
export const apartmentSchema = z.object({
  name: requiredString,
  city: requiredString,
  country: requiredString,
  bedrooms: z.coerce.number().int().min(0, "Can't be negative"),
  maxGuests: z.coerce.number().int().min(0, "Can't be negative"),
  pricePerNight: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(APARTMENT_STATUS_VALUES),
});

export type ApartmentFormValues = z.infer<typeof apartmentSchema>;
