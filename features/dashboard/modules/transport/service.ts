import { createStubService } from "../../crud";
import type { Transport } from "./types";
import type { TransportFormValues } from "./schemas";
import { TRANSPORT_SEED } from "./data";

/** Transport catalog data source (in-memory stub; repository-ready). */
export const transportService = createStubService<Transport, TransportFormValues>({
  seed: TRANSPORT_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "route"],
  idPrefix: "trn",
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

export const transportKeys = {
  all: ["catalog", "transport"] as const,
  detail: (id: string) => ["catalog", "transport", "detail", id] as const,
};
