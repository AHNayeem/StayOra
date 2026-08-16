/**
 * Localization data source — the storefront's real language and currency
 * settings, not a parallel list.
 *
 * The seeded rows here used to claim 92% Arabic coverage against a dictionary
 * that did not exist, and toggling a language changed nothing a visitor could
 * see. Now:
 *
 *   • languages project `constants/geo` + any locale added at runtime, with
 *     **measured** coverage from the shipped dictionaries plus operator edits
 *   • enabling/disabling writes to `features/i18n/locale-settings`, which is
 *     what the public switcher reads
 *   • currencies project the same table the FX engine quotes from, so the rate
 *     shown here is the rate a traveller is charged at
 *
 * Create/delete apply to runtime-added languages only: a built-in locale can be
 * switched off but not deleted, because the dictionary shipped with the app.
 */

import { CURRENCIES, LANGUAGES } from "@/constants/geo";
import { translationCoverage } from "@/features/i18n/dictionaries";
import {
  addCustomLanguage,
  localeSettings,
  removeCustomLanguage,
  setCurrencyEnabled,
  setLanguageEnabled,
} from "@/features/i18n/locale-settings";
import { quoteFx } from "../../domain/fx";
import { ApiError } from "../../data/errors";
import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import type { ResourceService } from "../../crud";
import type { Currency, Language } from "./types";

function languageRows(): Language[] {
  const settings = localeSettings();
  const builtIn = LANGUAGES.map((language) => ({ language, custom: false }));
  const custom = settings.custom.map((language) => ({
    language: { code: language.code, name: language.name, nativeName: language.nativeName, dir: language.dir },
    custom: true,
  }));
  return [...builtIn, ...custom].map(({ language, custom: isCustom }) => ({
    id: `lng_${language.code}`,
    code: language.code,
    name: language.name,
    nativeName: language.nativeName,
    rtl: language.dir === "rtl",
    coverage: translationCoverage(language.code),
    enabled: settings.enabledLanguages.includes(language.code),
    custom: isCustom,
  }));
}

function currencyRows(): Currency[] {
  const settings = localeSettings();
  return CURRENCIES.map((currency) => ({
    id: `cur_${currency.code}`,
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    // The quoted rate, spread included — what a traveller is actually charged.
    rate: quoteFx(currency.code).rate,
    enabled: settings.enabledCurrencies.includes(currency.code),
  }));
}

function page<T>(rows: T[], params: ListParams, search: (row: T) => string): Paginated<T> {
  const { page: pageNumber = 1, pageSize = 25, search: term } = params;
  let out = rows;
  const needle = term?.trim().toLowerCase();
  if (needle) out = out.filter((row) => search(row).toLowerCase().includes(needle));
  const total = out.length;
  const start = (pageNumber - 1) * pageSize;
  return paginate(out.slice(start, start + pageSize), { page: pageNumber, pageSize, total });
}

export const languagesService: ResourceService<
  Language,
  Omit<Language, "id">,
  Partial<Language>
> = {
  async list(params: ListParams = {}) {
    return page(languageRows(), params, (row) => `${row.code} ${row.name} ${row.nativeName}`);
  },

  async get(id: ID) {
    const row = languageRows().find((r) => r.id === id);
    if (!row) throw new ApiError({ kind: "not-found", message: "Unknown language." });
    return row;
  },

  /** Add a locale the app did not ship with. It starts at 0% coverage. */
  async create(input: Omit<Language, "id">) {
    const code = input.code.trim().toLowerCase();
    if (!/^[a-z]{2}(-[a-z]{2})?$/i.test(code)) {
      throw new ApiError({
        kind: "validation",
        message: "Use a BCP-47 language code, e.g. “fr” or “pt-br”.",
      });
    }
    if (languageRows().some((row) => row.code === code)) {
      throw new ApiError({ kind: "validation", message: "That language already exists." });
    }
    addCustomLanguage({
      code,
      name: input.name,
      nativeName: input.nativeName || input.name,
      dir: input.rtl ? "rtl" : "ltr",
    });
    if (input.enabled) setLanguageEnabled(code, true);
    return languagesService.get(`lng_${code}`);
  },

  /** Only `enabled` is meaningful — coverage is measured, never declared. */
  async update(id: ID, input: Partial<Language>) {
    const row = await languagesService.get(id);
    if (input.enabled !== undefined) {
      if (row.code === "en" && !input.enabled) {
        throw new ApiError({
          kind: "validation",
          message: "English is the source language and cannot be switched off.",
        });
      }
      setLanguageEnabled(row.code, input.enabled);
    }
    return languagesService.get(id);
  },

  async remove(id: ID) {
    const row = await languagesService.get(id);
    if (!row.custom) {
      throw new ApiError({
        kind: "validation",
        message: "Built-in languages ship with the app — switch it off instead.",
      });
    }
    removeCustomLanguage(row.code);
  },

  peek: languageRows,
};

export const currenciesService: ResourceService<
  Currency,
  Omit<Currency, "id">,
  Partial<Currency>
> = {
  async list(params: ListParams = {}) {
    return page(currencyRows(), params, (row) => `${row.code} ${row.name}`);
  },

  async get(id: ID) {
    const row = currencyRows().find((r) => r.id === id);
    if (!row) throw new ApiError({ kind: "not-found", message: "Unknown currency." });
    return row;
  },

  async create() {
    throw new ApiError({
      kind: "validation",
      message: "Currencies come from the FX rate table — enable one instead of adding it.",
    });
  },

  async update(id: ID, input: Partial<Currency>) {
    const row = await currenciesService.get(id);
    if (input.enabled !== undefined) setCurrencyEnabled(row.code, input.enabled);
    if (input.rate !== undefined && input.rate !== row.rate) {
      throw new ApiError({
        kind: "validation",
        message: "Rates come from the FX engine. Change the spread in Settings → FX.",
      });
    }
    return currenciesService.get(id);
  },

  async remove() {
    throw new ApiError({
      kind: "validation",
      message: "Currencies cannot be deleted — switch one off instead.",
    });
  },

  peek: currencyRows,
};

export const localizationKeys = {
  languages: ["localization", "languages"] as const,
  currencies: ["localization", "currencies"] as const,
  translations: (language: string) => ["localization", "translations", language] as const,
};
