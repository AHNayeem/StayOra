/**
 * Merchants module data access — query keys only.
 *
 * The service itself is the domain's {@link merchantService}; this module used
 * to own an in-memory stub with its own ids and a ratio commission rate, which
 * is exactly the contradiction the merchant model now resolves.
 */

export { merchantService } from "@/features/dashboard/domain";

export const merchantKeys = {
  all: ["merchants"] as const,
  list: () => ["merchants", "list"] as const,
  detail: (id: string) => ["merchants", "detail", id] as const,
  progress: (id: string) => ["merchants", "detail", id, "progress"] as const,
  performance: (id: string) => ["merchants", "detail", id, "performance"] as const,
  catalogue: (id: string) => ["merchants", "detail", id, "catalogue"] as const,
};
