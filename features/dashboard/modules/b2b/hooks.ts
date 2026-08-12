"use client";

import { type ReactNode } from "react";
import { useMutation, useQuery } from "../../data";
import { useResourceList } from "../../crud";
import { b2bService } from "../../domain/services";
import type { B2BAccountInput } from "../../domain/services";
import type { B2BAccount, B2BInvoice } from "../../domain/types";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { accountColumns, invoiceColumns } from "./columns";

export const b2bKeys = {
  accounts: ["b2b", "accounts"] as const,
  invoices: ["b2b", "invoices"] as const,
  summary: ["b2b", "summary"] as const,
  credit: (id: string) => ["b2b", "credit", id] as const,
};

const SIDE_EFFECTS = [["b2b"], ["notifications"], ["logs"], ["overview"]];

/**
 * B2B accounts, scoped.
 *
 * An agency principal is pinned to its own `organizationId`, so signing in as the
 * demo agency shows exactly one account — its own — while admin sees every
 * partner.
 */
export function useB2BAccounts(rowActions?: (row: B2BAccount) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<B2BAccount>({
    queryKey: ["b2b", "accounts", scope.organizationId ?? "all"],
    fetcher: (params) => b2bService.listAccounts(params, scope),
    columns: accountColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useB2BInvoices(rowActions?: (row: B2BInvoice) => ReactNode) {
  const scope = useDomainScope();
  return useResourceList<B2BInvoice>({
    queryKey: ["b2b", "invoices", scope.organizationId ?? "all"],
    fetcher: (params) => b2bService.listInvoices(params, scope),
    columns: invoiceColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "issuedAt", direction: "desc" },
    rowActions,
  });
}

/** B2B vs B2C roll-up for the segment overview. */
export function useB2BSummary() {
  const scope = useDomainScope();
  return useQuery({
    queryKey: [...b2bKeys.summary, scope.organizationId ?? "all"],
    queryFn: () => b2bService.summary(scope),
    staleTime: 10_000,
  });
}

/** Credit limit / used / available / overdue for one account. */
export function useCreditStatus(id: string | undefined) {
  return useQuery({
    queryKey: b2bKeys.credit(id ?? "none"),
    queryFn: () => b2bService.creditStatus(id!),
    enabled: Boolean(id),
  });
}

export function useUpdateB2BAccount() {
  const actor = useDomainActor();
  return useMutation<B2BAccount, { id: string; input: Partial<B2BAccountInput> }>({
    mutationFn: ({ id, input }) => b2bService.updateAccount(id, input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

export function useCreateB2BAccount() {
  const actor = useDomainActor();
  return useMutation<B2BAccount, B2BAccountInput>({
    mutationFn: (input) => b2bService.createAccount(input, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}

/** Record a payment against a consolidated invoice; releases credit. */
export function usePayInvoice() {
  const actor = useDomainActor();
  return useMutation<B2BInvoice, { id: string; amount: number }>({
    mutationFn: ({ id, amount }) => b2bService.payInvoice(id, amount, actor),
    invalidateKeys: SIDE_EFFECTS,
  });
}
