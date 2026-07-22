"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  CURRENCIES,
  LANGUAGES,
  findCountry,
  findCurrency,
  findLanguage,
} from "@/constants/geo";
import type { Country, Currency, Language } from "@/types/geo";
import {
  DEFAULT_PREFERENCES,
  useLocalePreferences,
  useSetLocale,
} from "./locale-store";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
} from "./format";

interface LocaleContextValue {
  language: Language;
  currency: Currency;
  country: Country | undefined;
  /** All options, for the switchers. */
  currencies: Currency[];
  languages: Language[];
  setLanguage: (code: string) => void;
  setCurrency: (code: string) => void;
  setCountry: (code: string) => void;
  /** Format a base-USD amount in the active currency. */
  money: (amountUsd: number, options?: Intl.NumberFormatOptions) => string;
  /** Format a plain number in the active language. */
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  /** Format an ISO date in the active language. */
  date: (iso: string, options?: Intl.DateTimeFormatOptions) => string;
  /** Format an ISO date + time in the active language. */
  dateTime: (iso: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const FALLBACK_LANGUAGE =
  findLanguage(DEFAULT_PREFERENCES.language) ?? LANGUAGES[0];
const FALLBACK_CURRENCY =
  findCurrency(DEFAULT_PREFERENCES.currency) ?? CURRENCIES[0];

/**
 * Provides the active locale and locale-bound formatters to the public site,
 * and keeps the document's `lang`/`dir` attributes in sync (so RTL languages
 * flip layout). Mounted once by the marketing layout.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const prefs = useLocalePreferences();
  const { setLanguage, setCurrency, setCountry } = useSetLocale();

  const language = findLanguage(prefs.language) ?? FALLBACK_LANGUAGE;
  const currency = findCurrency(prefs.currency) ?? FALLBACK_CURRENCY;
  const country = findCountry(prefs.country);

  // Side effect only (no setState) — keeps <html lang/dir> aligned with choice.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = language.code;
    root.dir = language.dir;
  }, [language.code, language.dir]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      currency,
      country,
      currencies: CURRENCIES,
      languages: LANGUAGES,
      setLanguage,
      setCurrency,
      setCountry,
      money: (amount, options) => formatMoney(amount, currency, options),
      number: (val, options) => formatNumber(val, language.code, options),
      date: (iso, options) => formatDate(iso, language.code, options),
      dateTime: (iso) => formatDateTime(iso, language.code),
    }),
    [language, currency, country, setLanguage, setCurrency, setCountry],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

/** Access the active locale + formatters. Throws outside {@link LocaleProvider}. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a <LocaleProvider>.");
  }
  return ctx;
}
