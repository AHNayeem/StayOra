import { z } from "zod";
import { emailSchema, requiredString } from "../../schemas/common";

/** Create-merchant form schema. Commission is entered as a percentage (0–100). */
export const createMerchantSchema = z.object({
  name: requiredString,
  email: emailSchema,
  contactName: requiredString,
  category: requiredString,
  country: requiredString,
  commissionPercent: z.coerce
    .number()
    .min(0, "Can't be negative")
    .max(100, "Can't exceed 100%"),
});

export type CreateMerchantValues = z.infer<typeof createMerchantSchema>;
