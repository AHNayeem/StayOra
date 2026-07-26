import { createStubService } from "../../crud";
import type { Resort } from "./types";
import type { ResortFormValues } from "./schemas";
import { RESORTS_SEED } from "./data";

/** Resorts catalog data source (in-memory stub; repository-ready). */
export const resortsService = createStubService<Resort, ResortFormValues>({
  seed: RESORTS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "city", "country"],
  idPrefix: "rst",
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

export const resortKeys = {
  all: ["catalog", "resorts"] as const,
  detail: (id: string) => ["catalog", "resorts", "detail", id] as const,
};
