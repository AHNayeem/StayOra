import { createStubService } from "../../crud";
import type { Payout } from "./types";
import { PAYOUTS_SEED } from "./data";

/** Payouts data source (in-memory stub; repository-ready). */
export const payoutsService = createStubService<Payout>({
  seed: PAYOUTS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "merchant"],
  idPrefix: "pyt",
});

export const payoutKeys = {
  all: ["finance", "payouts"] as const,
};
