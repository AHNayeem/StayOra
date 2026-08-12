/** Commission data source — the domain commission service plus module keys. */

export { commissionService } from "../../domain/services";

export const commissionKeys = {
  all: ["finance", "commission"] as const,
  summary: () => ["finance", "commission", "summary"] as const,
  breakdown: () => ["finance", "commission", "breakdown"] as const,
};
