import type { RoleId } from "../../rbac/types";
import type { User, UserStatus } from "./types";

const NAMES = [
  "AH Nayeem", "Marcus Bell", "Elena Petrova", "Sam Okafor", "Nina Kowalski",
  "Theo Martin", "Grace Lin", "Daniel Cohen", "Isabel Ferreira", "Raj Patel",
  "Clara Nguyen", "Felix Schmidt", "Maya Johnson", "Leo Rossi", "Zoe Clark",
];
const ROLES: RoleId[] = [
  "admin", "staff", "finance", "support", "marketing",
  "content_manager", "merchant", "vendor",
];
const STATUSES: UserStatus[] = ["active", "active", "active", "invited", "suspended"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2025, 10, 1) + dayOffset * 86_400_000).toISOString();
}

export const USERS_SEED: User[] = NAMES.map((name, i) => {
  const handle = name.toLowerCase().replace(/[^a-z]+/g, ".");
  return {
    id: `usr_${400 + i}`,
    name,
    email: `${handle}@stayora.app`,
    roleId: i === 0 ? "super_admin" : ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    lastActiveAt: iso((i * 3) % 120),
    createdAt: iso((i * 13) % 240),
  };
});
