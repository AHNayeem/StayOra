"use client";

import { ResourceListView, type UseResourceListResult } from "../../crud";
import { Tabs } from "../../ui";
import { useCurrencies, useLanguages } from "./hooks";
import type { Currency, Language } from "./types";

function LanguagesPanel() {
  const list: UseResourceListResult<Language> = useLanguages();
  return (
    <ResourceListView<Language>
      list={list}
      searchPlaceholder="Search language or code…"
      selectable={false}
      caption="Languages"
    />
  );
}

function CurrenciesPanel() {
  const list: UseResourceListResult<Currency> = useCurrencies();
  return (
    <ResourceListView<Currency>
      list={list}
      searchPlaceholder="Search currency or code…"
      selectable={false}
      caption="Currencies"
    />
  );
}

/** Localization — languages and currencies reference tables under tabs. */
export function Localization() {
  return (
    <Tabs
      items={[
        { key: "languages", label: "Languages", content: <LanguagesPanel /> },
        { key: "currencies", label: "Currencies", content: <CurrenciesPanel /> },
      ]}
    />
  );
}
