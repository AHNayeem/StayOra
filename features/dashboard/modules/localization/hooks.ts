"use client";

import { useResourceList } from "../../crud";
import { currencyColumns, languageColumns } from "./columns";
import { currenciesService, languagesService, localizationKeys } from "./service";
import type { Currency, Language } from "./types";

export function useLanguages() {
  return useResourceList<Language>({
    queryKey: localizationKeys.languages,
    fetcher: (params, signal) => languagesService.list(params, signal),
    columns: languageColumns,
    getRowId: (row) => row.id,
    initialPageSize: 25,
    initialSort: { field: "name", direction: "asc" },
  });
}

export function useCurrencies() {
  return useResourceList<Currency>({
    queryKey: localizationKeys.currencies,
    fetcher: (params, signal) => currenciesService.list(params, signal),
    columns: currencyColumns,
    getRowId: (row) => row.id,
    initialPageSize: 25,
    initialSort: { field: "code", direction: "asc" },
  });
}
