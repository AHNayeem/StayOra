/**
 * Tax rules data source.
 *
 * Delegates to the domain's `taxRuleService`, which is the same rule book the
 * money engine reads at quote time. It used to be a `createStubService` with
 * its own array, which is why editing a rate here changed nothing a customer
 * paid — see `domain/tax.ts`.
 */
import { taxRuleService } from "@/features/dashboard/domain";

export const taxesService = taxRuleService;

export const taxKeys = {
  all: ["finance", "tax"] as const,
};
