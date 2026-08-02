import { z } from "zod";
import { CABIN_CLASSES, PASSENGER_TYPES } from "@/types/flight";

/**
 * Traveller and contact validation for the flight booking flow.
 *
 * Airline data has rules ordinary forms don't, and getting them wrong strands
 * people at check-in desks. Three are enforced here because no downstream
 * service will catch them:
 *
 *  - **Names must match the travel document.** Airlines reject bookings whose
 *    name differs from the passport, and most won't allow a transfer — so the
 *    field warns about it and rejects characters passports don't carry.
 *  - **Passport validity outlasts the trip.** Most destinations require six
 *    months' validity beyond arrival; an expiry inside that window is a denied
 *    boarding, not a minor warning.
 *  - **Age matches the passenger type.** An "infant" born four years ago is a
 *    child fare, and the airline will re-price it at the airport.
 *
 * The date-of-birth checks need "today", which is passed in rather than read at
 * module scope so the schema stays pure and the module stays free of wall-clock
 * reads at import time.
 */

/** Latin letters, spaces, hyphens and apostrophes — what a passport MRZ carries. */
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters`)
    .max(40, `${label} must be 40 characters or fewer`)
    .regex(NAME_PATTERN, `${label} can only contain letters, spaces, hyphens and apostrophes`);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole years between two ISO dates. */
export function yearsBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  let years = ty - fy;
  if (tm < fm || (tm === fm && td < fd)) years -= 1;
  return years;
}

/** Age bands the airline applies at the date of travel. */
export const AGE_RULES = {
  infant: { min: 0, max: 1 },
  child: { min: 2, max: 11 },
  adult: { min: 12, max: 120 },
} as const;

/** Months of passport validity most destinations require beyond arrival. */
export const PASSPORT_VALIDITY_MONTHS = 6;

/** Human fare-type names used inside validation messages. */
const PASSENGER_LABEL = {
  adult: "adult",
  child: "child",
  infant: "infant",
} as const;

/**
 * Build the passenger schema for one traveller.
 *
 * `travelDate` and `today` are injected so the age and expiry rules are checked
 * against the *journey*, not against whenever the form happens to be rendered.
 */
export function passengerSchema(options: { travelDate: string; today: string }) {
  const { travelDate, today } = options;

  return z
    .object({
      type: z.enum(PASSENGER_TYPES),
      title: z.string().trim().min(1, "Select a title"),
      firstName: nameField("First name"),
      lastName: nameField("Last name"),
      dateOfBirth: z
        .string()
        .regex(ISO_DATE, "Enter a date of birth")
        .refine((d) => d <= today, "Date of birth can't be in the future"),
      gender: z.enum(["male", "female", "other"]),
      nationality: z.string().trim().length(2, "Select a nationality"),
      documentType: z.enum(["passport", "national-id"]),
      documentNumber: z
        .string()
        .trim()
        .min(5, "Document number looks too short")
        .max(20, "Document number looks too long")
        .regex(/^[A-Za-z0-9]+$/, "Document numbers contain only letters and numbers"),
      documentExpiry: z.string().regex(ISO_DATE, "Enter an expiry date"),
      frequentFlyerAirline: z.string().trim().optional(),
      frequentFlyerNumber: z
        .string()
        .trim()
        .max(20, "Frequent flyer number looks too long")
        .optional(),
    })
    // Cross-field rules live in one pass so each can raise a message tailored
    // to the actual values — a generic "invalid" here would leave the traveller
    // guessing which of three date rules they tripped.
    .superRefine((value, ctx) => {
      // 1. Age band must match the fare type at the date of travel.
      const age = yearsBetween(value.dateOfBirth, travelDate);
      const rule = AGE_RULES[value.type];
      if (age < rule.min || age > rule.max) {
        ctx.addIssue({
          code: "custom",
          path: ["dateOfBirth"],
          message: `A ${PASSENGER_LABEL[value.type]} must be ${rule.min}–${rule.max} years old on the travel date (this traveller would be ${age}). Adjust the traveller mix in your search if that's wrong.`,
        });
      }

      // 2. The document must outlast the trip. Passports need a validity buffer
      //    beyond arrival; national IDs only need to be valid on the day.
      if (value.documentExpiry && value.documentExpiry < travelDate) {
        ctx.addIssue({
          code: "custom",
          path: ["documentExpiry"],
          message: "This document expires before your travel date.",
        });
      } else if (value.documentType === "passport" && value.documentExpiry) {
        const [y, m, d] = travelDate.split("-").map(Number);
        const required = new Date(Date.UTC(y, m - 1 + PASSPORT_VALIDITY_MONTHS, d))
          .toISOString()
          .slice(0, 10);
        if (value.documentExpiry < required) {
          ctx.addIssue({
            code: "custom",
            path: ["documentExpiry"],
            message: `Most destinations require ${PASSPORT_VALIDITY_MONTHS} months' passport validity beyond arrival — this passport should be valid until at least ${required}.`,
          });
        }
      }

      // 3. A programme number without an airline can't be credited anywhere.
      if (value.frequentFlyerNumber && !value.frequentFlyerAirline) {
        ctx.addIssue({
          code: "custom",
          path: ["frequentFlyerAirline"],
          message: "Choose the airline this frequent flyer number belongs to.",
        });
      }
    });
}

export type PassengerFormValues = z.infer<ReturnType<typeof passengerSchema>>;

/** Contact + emergency details collected once per booking. */
export const contactSchema = z.object({
  email: z.email("Enter a valid email address"),
  phoneCountryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Select a dialling code"),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a phone number")
    .max(15, "Phone number looks too long")
    .regex(/^\d+$/, "Phone numbers contain digits only"),
  country: z.string().trim().length(2, "Select a country"),
  emergencyName: z.string().trim().max(60).optional(),
  emergencyRelationship: z.string().trim().max(30).optional(),
  emergencyPhoneCountryCode: z.string().trim().optional(),
  emergencyPhone: z.string().trim().max(15).optional(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

/** The whole traveller step: every passenger plus the shared contact block. */
export function travellersSchema(options: { travelDate: string; today: string }) {
  return z.object({
    passengers: z.array(passengerSchema(options)).min(1, "Add at least one traveller"),
    contact: contactSchema,
  });
}

export type TravellersFormValues = z.infer<ReturnType<typeof travellersSchema>>;

/** Cabin classes as `<Select>` options — re-exported for form convenience. */
export const CABIN_OPTIONS = CABIN_CLASSES;
