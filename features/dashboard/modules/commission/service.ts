import { createStubService } from "../../crud";
import type { Commission } from "./types";
import { COMMISSIONS_SEED } from "./data";

/** Commission data source (in-memory stub; repository-ready). */
export const commissionsService = createStubService<Commission>({
  seed: COMMISSIONS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "merchant", "bookingRef"],
  idPrefix: "cmn",
});

export const commissionKeys = {
  all: ["finance", "commission"] as const,
};
