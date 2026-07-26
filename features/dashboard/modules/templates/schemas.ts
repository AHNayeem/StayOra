import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { TEMPLATE_CHANNEL_VALUES } from "./types";

/** Notification-template form schema — serves both create and edit. */
export const templateSchema = z
  .object({
    name: requiredString,
    key: requiredString
      .transform((v) => v.trim().toLowerCase())
      .pipe(
        z
          .string()
          .regex(/^[a-z0-9]+(?:[._][a-z0-9]+)*$/, "Use dot/underscore slug, e.g. booking.confirmed"),
      ),
    channel: z.enum(TEMPLATE_CHANNEL_VALUES),
    subject: z.string().trim().optional().default(""),
    body: requiredString.pipe(z.string().max(2000, "Keep under 2000 characters")),
    description: z.string().trim().optional().default(""),
    enabled: z.coerce.boolean().default(true),
  })
  .refine((v) => v.channel !== "email" || v.subject.length > 0, {
    path: ["subject"],
    message: "Email templates need a subject",
  });

export type TemplateFormValues = z.infer<typeof templateSchema>;
