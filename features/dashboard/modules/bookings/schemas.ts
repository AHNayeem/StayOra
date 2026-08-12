import { z } from "zod";
import { emailSchema, requiredString } from "../../schemas/common";

/**
 * Create-booking form schema.
 *
 * Validation lives here, not in the component — and deliberately stops at
 * *input* validity. The money (discount, taxes, commission, totals) is never
 * accepted from the form: the domain prices the booking centrally, so the form
 * only collects the base amount and an optional promo code.
 */
export const createBookingSchema = z
  .object({
    segment: z.enum(["b2c", "b2b"]),
    organizationId: z.string().optional(),
    customerName: requiredString,
    customerEmail: emailSchema,
    productKind: requiredString,
    productTitle: requiredString,
    destination: requiredString,
    merchantId: requiredString,
    comboId: z.string().optional(),
    startAt: requiredString,
    endAt: requiredString,
    quantity: z.coerce.number().int().min(1, "At least one unit"),
    baseAmount: z.coerce.number().min(1, "Enter the list price"),
    promoCode: z.string().optional(),
    travelerNames: z.string().optional(),
  })
  .refine((data) => data.endAt >= data.startAt, {
    message: "End date must be on or after the start date",
    path: ["endAt"],
  })
  .refine((data) => data.segment !== "b2b" || Boolean(data.organizationId), {
    message: "Pick the B2B account this booking belongs to",
    path: ["organizationId"],
  });

export type CreateBookingValues = z.infer<typeof createBookingSchema>;
