import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { MEDIA_TYPE_VALUES } from "./types";

/** Media upload form schema (stands in for a real upload; metadata only). */
export const mediaSchema = z.object({
  name: requiredString,
  type: z.enum(MEDIA_TYPE_VALUES),
  folder: requiredString.transform((v) => v.trim().toLowerCase()),
  dimensions: z.string().trim().optional().default(""),
  /** Size in kilobytes; converted to bytes on save. */
  sizeKb: z.coerce.number().min(0, "Must be 0 or more"),
});

export type MediaFormValues = z.infer<typeof mediaSchema>;
