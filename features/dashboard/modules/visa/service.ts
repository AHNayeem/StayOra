import { createStubService } from "../../crud";
import type { Visa } from "./types";
import type { VisaFormValues } from "./schemas";
import { VISAS_SEED } from "./data";

/** Visa services catalog data source (in-memory stub; repository-ready). */
export const visasService = createStubService<Visa, VisaFormValues>({
  seed: VISAS_SEED,
  getId: (row) => row.id,
  searchFields: ["country", "type"],
  idPrefix: "vsa",
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

export const visaKeys = {
  all: ["catalog", "visas"] as const,
  detail: (id: string) => ["catalog", "visas", "detail", id] as const,
};
