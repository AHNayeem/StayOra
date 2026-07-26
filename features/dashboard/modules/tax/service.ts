import { createStubService } from "../../crud";
import type { TaxRule } from "./types";
import type { TaxFormValues } from "./schemas";
import { TAXES_SEED } from "./data";

/** Tax rules configuration data source (in-memory stub; repository-ready). */
export const taxesService = createStubService<TaxRule, TaxFormValues>({
  seed: TAXES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "region", "category"],
  idPrefix: "tax",
  applyCreate: (input, id) => ({
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const taxKeys = {
  all: ["finance", "tax"] as const,
};
