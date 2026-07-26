import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { HOTEL_STATUS_VALUES } from "./types";

/** Hotel form schema — serves both create and edit. */
export const hotelSchema = z.object({
  name: requiredString,
  city: requiredString,
  country: requiredString,
  rooms: z.coerce.number().int().min(0, "Can't be negative"),
  rating: z.coerce.number().min(0, "Min 0").max(5, "Max 5"),
  pricePerNight: z.coerce.number().min(0, "Can't be negative"),
  currency: requiredString,
  status: z.enum(HOTEL_STATUS_VALUES),
});

export type HotelFormValues = z.infer<typeof hotelSchema>;
