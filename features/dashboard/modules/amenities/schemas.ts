import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { AMENITY_CATEGORY_VALUES, AMENITY_STATUS_VALUES } from "./types";

/** Amenity form schema — serves both create and edit. */
export const amenitySchema = z.object({
  name: requiredString,
  category: z.enum(AMENITY_CATEGORY_VALUES),
  icon: requiredString,
  status: z.enum(AMENITY_STATUS_VALUES),
});

export type AmenityFormValues = z.infer<typeof amenitySchema>;
