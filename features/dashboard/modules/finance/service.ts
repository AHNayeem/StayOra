import { createStubService } from "../../crud";
import type { Payment } from "./types";
import { PAYMENTS_SEED } from "./data";

/** Payments data source (in-memory stub; repository-ready). */
export const paymentsService = createStubService<Payment>({
  seed: PAYMENTS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "merchant", "bookingRef"],
  idPrefix: "pay",
});

export const paymentKeys = {
  all: ["finance", "payments"] as const,
};
