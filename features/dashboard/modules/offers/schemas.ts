import { z } from "zod";
import { requiredString } from "../../schemas/common";

/**
 * Offer form schema — the rule set an offer is allowed to express. The engine in
 * `domain/money.ts` is what *applies* these rules; this only guarantees the
 * stored offer is coherent (window ordering, capped percentages, sane limits).
 */
export const offerSchema = z
  .object({
    name: requiredString,
    description: requiredString,
    scope: z.enum(["platform", "merchant"]),
    offerType: z.enum(["promo_code", "seasonal", "flash", "member"]),
    discountType: z.enum(["percent", "fixed"]),
    value: z.coerce.number().min(0.01, "Enter a discount above zero"),
    promoCode: z.string().optional(),
    startAt: requiredString,
    endAt: requiredString,
    minBookingAmount: z.coerce.number().min(0),
    maxDiscount: z.coerce.number().min(0),
    products: z.array(z.string()).default([]),
    destinations: z.array(z.string()).default([]),
    eligibility: z.enum(["all", "new", "returning", "member", "b2b"]),
    usageLimit: z.coerce.number().int().min(0),
    perUserLimit: z.coerce.number().int().min(0),
    status: z.enum(["draft", "scheduled", "active", "paused", "expired"]),
    terms: z.string().default(""),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "End date must be after the start date",
    path: ["endAt"],
  })
  .refine((d) => d.discountType !== "percent" || d.value <= 100, {
    message: "A percentage discount can't exceed 100%",
    path: ["value"],
  });

export type OfferValues = z.infer<typeof offerSchema>;

/** One product line inside a combo bundle. */
export const comboItemSchema = z.object({
  kind: requiredString,
  title: requiredString,
  merchantId: requiredString,
  price: z.coerce.number().min(0.01, "Enter the standalone price"),
  detail: z.string().default(""),
});

/**
 * Combo schema. The combo price must beat the sum of the parts — a bundle that
 * isn't cheaper isn't a combo, and the savings figure the UI advertises is
 * derived from exactly this constraint.
 */
export const comboSchema = z
  .object({
    name: requiredString,
    description: requiredString,
    destination: requiredString,
    items: z.array(comboItemSchema).min(2, "A combo needs at least two products"),
    comboPrice: z.coerce.number().min(0.01, "Enter the bundle price"),
    validFrom: requiredString,
    validTo: requiredString,
    inventory: z.coerce.number().int().min(1, "At least one package"),
    eligibility: z.enum(["all", "new", "returning", "member", "b2b"]),
    cancellationPolicyId: z.enum(["flexible", "moderate", "strict", "non_refundable"]),
    refundHandling: z.enum(["pro_rata", "bundle_only", "non_refundable"]),
    status: z.enum(["draft", "scheduled", "active", "paused", "expired"]),
    terms: z.string().default(""),
  })
  .refine((d) => d.validTo > d.validFrom, {
    message: "Valid-to must be after valid-from",
    path: ["validTo"],
  })
  .refine(
    (d) => d.comboPrice < d.items.reduce((sum, item) => sum + Number(item.price || 0), 0),
    {
      message: "The combo price must be lower than the sum of the individual prices",
      path: ["comboPrice"],
    },
  );

export type ComboValues = z.infer<typeof comboSchema>;
