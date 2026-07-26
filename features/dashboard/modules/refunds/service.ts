import { createStubService } from "../../crud";
import type { Refund } from "./types";
import { REFUNDS_SEED } from "./data";

/** Refunds data source (in-memory stub; repository-ready). */
export const refundsService = createStubService<Refund>({
  seed: REFUNDS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "bookingRef", "customer"],
  idPrefix: "rfd",
});

export const refundKeys = {
  all: ["finance", "refunds"] as const,
};
