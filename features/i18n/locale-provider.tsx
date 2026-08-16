"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
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
import { quoteFx, type FxQuote } from "@/features/dashboard/domain/fx";
import {
  configRevision,
  subscribeConfig,
} from "@/features/dashboard/domain/platform-config";
import { translate } from "./dictionaries";
import {
  localeSettings,
  localeSettingsRevision,
  subscribeLocaleSettings,
} from "./locale-settings";

interface LocaleContextValue {
  language: Language;
  currency: Currency;
  /** The platform's live quote for the active currency (mid + FX spread). */
  fx: FxQuote;
  country: Country | undefined;
  /** All options, for the switchers. */
  currencies: Currency[];
  languages: Language[];
  setLanguage: (code: string) => void;
  setCurrency: (code: string) => void;
  setCountry: (code: string) => void;
  /** Translate an English source string into the active language (falls back
   * to the source when the language or key is untranslated). */
  t: (source: string) => string;
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

  // Which languages/currencies the platform currently offers. Server snapshot
  // is 0 so SSR renders the shipped set and the client re-derives after hydration.
  const localeRevision = useSyncExternalStore(
    subscribeLocaleSettings,
    localeSettingsRevision,
    () => 0,
  );
  const { languages, currencies } = useMemo(() => {
    const settings = localeSettings();
    const custom: Language[] = settings.custom.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      dir: l.dir,
    }));
    const offered = [...LANGUAGES, ...custom].filter((l) =>
      settings.enabledLanguages.includes(l.code),
    );
    return {
      languages: offered.length > 0 ? offered : [FALLBACK_LANGUAGE],
      currencies: CURRENCIES.filter((c) => settings.enabledCurrencies.includes(c.code)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `localeRevision` is the store snapshot
  }, [localeRevision]);

  // A language that has since been switched off falls back to the default
  // rather than leaving the visitor stuck on an unavailable locale.
  const language =
    languages.find((l) => l.code === prefs.language) ?? languages[0] ?? FALLBACK_LANGUAGE;
  const currency =
    currencies.find((c) => c.code === prefs.currency) ??
    findCurrency(prefs.currency) ??
    FALLBACK_CURRENCY;
  const country = findCountry(prefs.country);

  // Re-quote when an admin changes the FX spread in Settings. The server
  // snapshot is 0, so SSR renders the shipped configuration and the client
  // re-derives after hydration.
  const revision = useSyncExternalStore(subscribeConfig, configRevision, () => 0);
  const fx = useMemo(
    () => quoteFx(currency.code),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `revision` is the store snapshot
    [currency.code, revision],
  );

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
      fx,
      country,
      currencies,
      languages,
      setLanguage,
      setCurrency,
      setCountry,
      t: (source) => translate(language.code, source),
      money: (amount, options) => formatMoney(amount, currency, options, fx.rate),
      number: (val, options) => formatNumber(val, language.code, options),
      date: (iso, options) => formatDate(iso, language.code, options),
      dateTime: (iso) => formatDateTime(iso, language.code),
    }),
    [
      language,
      currency,
      fx,
      country,
      currencies,
      languages,
      setLanguage,
      setCurrency,
      setCountry,
    ],
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

/**
 * Translation helper — returns `t(source)` for the active language. Unlike
 * {@link useLocale} this is safe to call outside a {@link LocaleProvider}
 * (e.g. in shared chrome also used by the dashboard): with no provider it
 * returns an identity function, so copy simply renders in English.
 */
export function useT(): (source: string) => string {
  const ctx = useContext(LocaleContext);
  return ctx ? ctx.t : identity;
}

const identity = (source: string) => source;
