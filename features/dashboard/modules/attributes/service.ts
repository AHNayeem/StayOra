import { createStubService } from "../../crud";
import type { Attribute } from "./types";
import type { AttributeFormValues } from "./schemas";
import { ATTRIBUTES_SEED } from "./data";

/** Attributes catalog data source (in-memory stub; repository-ready). */
export const attributesService = createStubService<
  Attribute,
  AttributeFormValues
>({
  seed: ATTRIBUTES_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "group"],
  idPrefix: "atr",
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

export const attributeKeys = {
  all: ["catalog", "attributes"] as const,
  detail: (id: string) => ["catalog", "attributes", "detail", id] as const,
};
