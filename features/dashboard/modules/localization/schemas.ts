import { z } from "zod";
import { requiredString } from "../../schemas/common";

/** Language form schema. Coverage is entered as a percentage (0–100). */
export const languageSchema = z.object({
  code: requiredString.transform((v) => v.toLowerCase()),
  name: requiredString,
  nativeName: requiredString,
  direction: z.enum(["ltr", "rtl"]),
  coverage: z.coerce.number().min(0, "Min 0").max(100, "Max 100"),
  status: z.enum(["enabled", "disabled"]),
});

export type LanguageFormValues = z.infer<typeof languageSchema>;

/** Currency form schema. Rate is relative to the base currency. */
export const currencySchema = z.object({
  code: requiredString.transform((v) => v.toUpperCase()),
  name: requiredString,
  symbol: requiredString,
  rate: z.coerce.number().positive("Must be greater than 0"),
  status: z.enum(["enabled", "disabled"]),
});

export type CurrencyFormValues = z.infer<typeof currencySchema>;
