import { z } from "zod";
import { emailSchema, requiredString } from "../../schemas/common";
import { ROLE_LIST } from "../../rbac/roles";
import { USER_STATUS_VALUES } from "./types";

const ROLE_IDS = ROLE_LIST.map((r) => r.id) as [string, ...string[]];

/** User form schema — serves both invite (create) and edit. */
export const userSchema = z.object({
  name: requiredString,
  email: emailSchema,
  roleId: z.enum(ROLE_IDS),
  status: z.enum(USER_STATUS_VALUES),
});

export type UserFormValues = z.infer<typeof userSchema>;
