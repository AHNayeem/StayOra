"use client";

import { useResourceList } from "../../crud";
import { useQuery } from "../../data";
import { transactionColumns } from "./columns";
import {
  getTransactionSummary,
  transactionKeys,
  transactionsService,
} from "./service";
import type { Transaction } from "./types";

export function useTransactions() {
  return useResourceList<Transaction>({
    queryKey: transactionKeys.all,
    fetcher: (params, signal) => transactionsService.list(params, signal),
    columns: transactionColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "createdAt", direction: "desc" },
  });
}

export function useTransactionSummary() {
  return useQuery({
    queryKey: transactionKeys.summary,
    queryFn: () => getTransactionSummary(),
    staleTime: 60_000,
  });
}
