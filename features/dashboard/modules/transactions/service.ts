import { createStubService } from "../../crud";
import type { Transaction, TransactionSummary } from "./types";
import { TRANSACTIONS_SEED } from "./data";

/** Wallet transaction ledger (in-memory stub; repository-ready). */
export const transactionsService = createStubService<Transaction>({
  seed: TRANSACTIONS_SEED,
  getId: (row) => row.id,
  searchFields: ["reference", "merchant", "description"],
  idPrefix: "txn",
});

/** Aggregate KPIs — mirrors a `/finance/transactions/summary` endpoint. */
export function getTransactionSummary(): Promise<TransactionSummary> {
  const completed = TRANSACTIONS_SEED.filter((t) => t.status === "completed");
  const inflow = completed
    .filter((t) => t.direction === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const outflow = completed
    .filter((t) => t.direction === "debit")
    .reduce((sum, t) => sum + t.amount, 0);
  const summary: TransactionSummary = {
    inflow: Math.round(inflow * 100) / 100,
    outflow: Math.round(outflow * 100) / 100,
    net: Math.round((inflow - outflow) * 100) / 100,
    count: TRANSACTIONS_SEED.length,
    currency: "USD",
  };
  return new Promise((resolve) => setTimeout(() => resolve(summary), 300));
}

export const transactionKeys = {
  all: ["finance", "transactions"] as const,
  summary: ["finance", "transactions", "summary"] as const,
};
