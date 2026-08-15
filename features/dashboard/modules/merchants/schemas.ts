import { z } from "zod";
import { MERCHANT_ROLE_IDS, MERCHANT_PLAN_LIST } from "@/features/dashboard/domain";
import { BOOKING_VERTICALS } from "@/types/booking";

/** Shared field rules, so every merchant form validates the same way. */
const email = z.string().trim().min(1, "Email is required.").email("Enter a valid email address.");
const phone = z.string().trim().min(6, "Enter a contact phone number.");

/** Admin invite / public partner registration. */
export const registerMerchantSchema = z.object({
  name: z.string().trim().min(2, "Enter your trading name."),
  legalName: z.string().trim().min(2, "Enter the registered legal name."),
  email,
  phone,
  contactName: z.string().trim().min(2, "Enter the primary contact's name."),
  contactRole: z.string().trim().optional(),
  country: z.string().trim().min(2, "Choose a country."),
  city: z.string().trim().min(2, "Enter a city."),
  verticals: z
    .array(z.enum(BOOKING_VERTICALS))
    .min(1, "Choose at least one product you supply."),
  website: z.union([z.string().trim().url("Enter a full URL, e.g. https://…"), z.literal("")]).optional(),
  description: z.string().trim().optional(),
});

export type RegisterMerchantValues = z.infer<typeof registerMerchantSchema>;

/** Onboarding step 1 — the business profile. */
export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your trading name."),
  legalName: z.string().trim().min(2, "Enter the registered legal name."),
  businessType: z.enum([
    "sole_trader",
    "private_limited",
    "public_limited",
    "partnership",
    "non_profit",
  ]),
  registrationNo: z.string().trim().min(3, "Enter your business registration number."),
  taxId: z.string().trim().min(3, "Enter your tax / VAT registration number."),
  foundedYear: z.coerce
    .number()
    .int()
    .min(1800, "Enter a valid year.")
    .max(2100, "Enter a valid year.")
    .optional(),
  website: z.union([z.string().trim().url("Enter a full URL, e.g. https://…"), z.literal("")]).optional(),
  description: z
    .string()
    .trim()
    .min(40, "Write at least 40 characters — this is what customers read first."),
  addressLine: z.string().trim().min(4, "Enter your street address."),
  city: z.string().trim().min(2, "Enter a city."),
  country: z.string().trim().min(2, "Enter a country."),
  postalCode: z.string().trim().min(2, "Enter a postal code."),
  verticals: z
    .array(z.enum(BOOKING_VERTICALS))
    .min(1, "Choose at least one product you supply."),
});

export type BusinessProfileValues = z.infer<typeof businessProfileSchema>;

/** Onboarding step 2 — contacts. */
export const contactDetailsSchema = z.object({
  contactName: z.string().trim().min(2, "Enter the primary contact's name."),
  contactRole: z.string().trim().min(2, "Enter their role."),
  email,
  phone,
  supportEmail: z.union([email, z.literal("")]).optional(),
  supportPhone: z.union([z.string().trim().min(6), z.literal("")]).optional(),
});

export type ContactDetailsValues = z.infer<typeof contactDetailsSchema>;

/** Onboarding step 4 — beneficial owners. */
export const beneficialOwnerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the owner's full name."),
  role: z.string().trim().min(2, "Enter their role."),
  ownershipPercent: z.coerce
    .number()
    .min(0, "Ownership cannot be negative.")
    .max(100, "Ownership cannot exceed 100%."),
  nationality: z.string().trim().min(2, "Enter a nationality."),
  idNumberMasked: z.string().trim().min(4, "Enter the last digits of their ID."),
});

export const kycSchema = z.object({
  owners: z.array(beneficialOwnerSchema).min(1, "Declare at least one beneficial owner."),
});

export type KycValues = z.infer<typeof kycSchema>;

/** Onboarding step 5 — the agreement. */
export const contractSchema = z.object({
  acceptedBy: z.string().trim().min(3, "Type the authorised signatory's full name."),
  accepted: z.literal(true, { message: "You need to accept the terms to continue." }),
});

export type ContractValues = z.infer<typeof contractSchema>;

/** Onboarding step 6 — payout details. */
export const bankDetailsSchema = z
  .object({
    accountHolder: z.string().trim().min(2, "Enter the account holder's name."),
    bankName: z.string().trim().min(2, "Enter the bank name."),
    accountNumber: z
      .string()
      .trim()
      .refine((v) => v.replace(/\D/g, "").length >= 6, "Enter a valid account number."),
    branch: z.string().trim().optional(),
    iban: z.string().trim().optional(),
    swift: z.string().trim().optional(),
    country: z.string().trim().min(2, "Enter the bank's country."),
    currency: z.string().trim().min(3, "Choose a payout currency."),
    method: z.enum(["bank_transfer", "wire", "payoneer", "wise"]),
    schedule: z.enum(["weekly", "biweekly", "monthly"]),
  })
  // An international wire without a SWIFT/BIC simply cannot be sent.
  .refine((v) => v.method !== "wire" || Boolean(v.swift?.trim()), {
    message: "International wires need a SWIFT/BIC code.",
    path: ["swift"],
  });

export type BankDetailsValues = z.infer<typeof bankDetailsSchema>;

/** Staff invite. */
export const staffSchema = z.object({
  name: z.string().trim().min(2, "Enter their name."),
  email,
  role: z.enum(MERCHANT_ROLE_IDS),
  propertyIds: z.array(z.string()).optional(),
});

export type StaffValues = z.infer<typeof staffSchema>;

/** Property create/edit. */
export const propertySchema = z.object({
  name: z.string().trim().min(2, "Give the property a name."),
  vertical: z.enum(BOOKING_VERTICALS),
  city: z.string().trim().min(2, "Enter a city."),
  country: z.string().trim().min(2, "Enter a country."),
  addressLine: z.string().trim().min(4, "Enter the street address."),
  units: z.coerce.number().int().min(1, "Enter at least one room, unit or seat."),
  status: z.enum(["draft", "active", "inactive"]).optional(),
});

export type PropertyValues = z.infer<typeof propertySchema>;

/** Channel-manager connection. */
export const channelSchema = z.object({
  provider: z.enum(["siteminder", "cloudbeds", "channex", "custom_api"]),
  externalRef: z.string().trim().min(2, "Enter the property code from your provider."),
  scopes: z
    .array(z.enum(["inventory", "rates", "availability", "reservations"]))
    .min(1, "Choose at least one thing to sync."),
});

export type ChannelValues = z.infer<typeof channelSchema>;

/** Admin: commission override, in percent. */
export const commissionSchema = z.object({
  commissionRate: z.coerce
    .number()
    .min(0, "Commission cannot be negative.")
    .max(60, "Commission above 60% is not allowed."),
});

export type CommissionValues = z.infer<typeof commissionSchema>;

/** Admin: a decision that has to carry a reason. */
export const reviewDecisionSchema = z.object({
  note: z.string().trim().min(10, "Tell the merchant what needs to change (10+ characters)."),
});

export type ReviewDecisionValues = z.infer<typeof reviewDecisionSchema>;

export const PLAN_OPTIONS = MERCHANT_PLAN_LIST.map((p) => ({ value: p.id, label: p.name }));
