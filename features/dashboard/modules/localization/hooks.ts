"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import { currencyColumns, languageColumns } from "./columns";
import { currenciesService, languagesService, localizationKeys } from "./service";
import type { Currency, Language } from "./types";

export function useLanguages(rowActions?: (row: Language) => ReactNode) {
  return useResourceList<Language>({
    queryKey: localizationKeys.languages,
    fetcher: (params, signal) => languagesService.list(params, signal),
    columns: languageColumns,
    getRowId: (row) => row.id,
    initialPageSize: 25,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCurrencies(rowActions?: (row: Currency) => ReactNode) {
  return useResourceList<Currency>({
    queryKey: localizationKeys.currencies,
    fetcher: (params, signal) => currenciesService.list(params, signal),
    columns: currencyColumns,
    getRowId: (row) => row.id,
    initialPageSize: 25,
    initialSort: { field: "code", direction: "asc" },
    rowActions,
  });
}

// --- Languages mutations ---------------------------------------------------
export function useCreateLanguage() {
  return useMutation<Language, Omit<Language, "id">>({
    mutationFn: (input) => languagesService.create(input),
    invalidateKeys: [localizationKeys.languages],
  });
}

export function useUpdateLanguage() {
  return useMutation<Language, { id: string; input: Partial<Language> }>({
    mutationFn: ({ id, input }) => languagesService.update(id, input),
    invalidateKeys: [localizationKeys.languages],
  });
}

export function useDeleteLanguage() {
  return useMutation<void, string>({
    mutationFn: (id) => languagesService.remove(id),
    invalidateKeys: [localizationKeys.languages],
  });
}

// --- Currencies mutations --------------------------------------------------
export function useCreateCurrency() {
  return useMutation<Currency, Omit<Currency, "id">>({
    mutationFn: (input) => currenciesService.create(input),
    invalidateKeys: [localizationKeys.currencies],
  });
}

export function useUpdateCurrency() {
  return useMutation<Currency, { id: string; input: Partial<Currency> }>({
    mutationFn: ({ id, input }) => currenciesService.update(id, input),
    invalidateKeys: [localizationKeys.currencies],
  });
}

export function useDeleteCurrency() {
  return useMutation<void, string>({
    mutationFn: (id) => currenciesService.remove(id),
    invalidateKeys: [localizationKeys.currencies],
  });
}
