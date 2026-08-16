import { z } from "zod";
import { emailSchema, requiredString } from "../../schemas/common";
import { roleExists } from "../../rbac/roles";
import { USER_STATUS_VALUES } from "./types";

/**
 * User form schema — serves both invite (create) and edit.
 *
 * The role is validated against the *runtime* registry rather than a compile-time
 * enum, because roles can be created at runtime; an id that no longer exists is
 * rejected here instead of silently granting the fallback role.
 */
export const userSchema = z.object({
  name: requiredString,
  email: emailSchema,
  roleId: z
    .string()
    .min(1, "Pick a role")
    .refine((id) => roleExists(id), "That role no longer exists."),
  status: z.enum(USER_STATUS_VALUES),
});

export type UserFormValues = z.infer<typeof userSchema>;
