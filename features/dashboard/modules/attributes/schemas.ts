import { z } from "zod";
import { requiredString } from "../../schemas/common";
import { ATTRIBUTE_INPUT_TYPE_VALUES, ATTRIBUTE_STATUS_VALUES } from "./types";

/** Attribute form schema — serves both create and edit. */
export const attributeSchema = z.object({
  name: requiredString,
  group: requiredString,
  inputType: z.enum(ATTRIBUTE_INPUT_TYPE_VALUES),
  valuesCount: z.coerce.number().int().min(0, "Can't be negative"),
  status: z.enum(ATTRIBUTE_STATUS_VALUES),
});

export type AttributeFormValues = z.infer<typeof attributeSchema>;
