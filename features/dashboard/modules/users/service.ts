import { createStubService } from "../../crud";
import type { RoleId } from "../../rbac/types";
import type { User } from "./types";
import type { UserFormValues } from "./schemas";
import { USERS_SEED } from "./data";

/** Platform users data source (in-memory stub; repository-ready). */
export const usersService = createStubService<User, UserFormValues, UserFormValues>({
  seed: USERS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "email"],
  idPrefix: "usr",
  applyCreate: (input, id) => ({
    ...input,
    roleId: input.roleId as RoleId,
    id,
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    roleId: input.roleId as RoleId,
  }),
});

export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};
