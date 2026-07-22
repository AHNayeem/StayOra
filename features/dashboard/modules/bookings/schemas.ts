import { z } from "zod";
import { emailSchema, requiredString } from "../../schemas/common";
import { BOOKING_STATUS_VALUES } from "./types";

/**
 * Create-booking form schema. Drives `useZodForm` (field types are inferred) and
 * validates before the (stub) service is called. Business rules live here, not
 * in the component.
 */
export const createBookingSchema = z
  .object({
    guestName: requiredString,
    guestEmail: emailSchema,
    property: requiredString,
    propertyType: requiredString,
    checkIn: requiredString,
    checkOut: requiredString,
    guests: z.coerce.number().int().min(1, "At least one guest"),
    amount: z.coerce.number().min(0, "Amount can't be negative"),
    currency: requiredString,
    status: z.enum(BOOKING_STATUS_VALUES),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type CreateBookingValues = z.infer<typeof createBookingSchema>;
