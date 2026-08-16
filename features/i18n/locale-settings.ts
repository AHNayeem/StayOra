/**
 * Locale settings — which languages and currencies the storefront offers, and
 * the translations an operator has edited.
 *
 * This is the seam that made the language switcher honest. It used to offer ten
 * languages backed by one dictionary; now the dashboard's Localization module
 * writes here, the public switcher reads from here, and a string edited in the
 * dashboard changes the site on the next render.
 *
 * Structure mirrors what a real i18n backend would return, so swapping this for
 * `GET /i18n/settings` + `GET /i18n/messages/:lang` touches nothing above it:
 *
 *   enabledLanguages   string[]                      — switcher options
 *   enabledCurrencies  string[]                      — currency options
 *   custom             CustomLanguage[]              — locales added at runtime
 *   overrides          { [lang]: { [source]: text } } — edited copy, per locale
 */

export interface CustomLanguage {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

export interface LocaleSettings {
  /** Languages offered by the public switcher. */
  enabledLanguages: string[];
  /** Currencies offered by the public switcher. */
  enabledCurrencies: string[];
  custom: CustomLanguage[];
  overrides: Record<string, Record<string, string>>;
}

/**
 * Ship enabled: English (source), Arabic and Bangla — the three with real
 * dictionaries. Everything else stays off until it has translations, which is
 * what stops the switcher promising a language it cannot deliver.
 */
export const DEFAULT_LOCALE_SETTINGS: LocaleSettings = {
  enabledLanguages: ["en", "ar", "bn"],
  enabledCurrencies: ["USD", "EUR", "GBP", "AED", "SAR", "INR", "BDT", "JPY", "SGD", "AUD"],
  custom: [],
  overrides: {},
};

const STORAGE_KEY = "otithee:i18n:v1";
const EVENT = "otithee:i18n-change";

let current: LocaleSettings | null = null;
let hydrated = false;
let revision = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function hydrate(): LocaleSettings {
  if (!isBrowser()) return DEFAULT_LOCALE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOCALE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LocaleSettings>;
    return { ...DEFAULT_LOCALE_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_LOCALE_SETTINGS;
  }
}

/** The active settings. Server renders the shipped defaults. */
export function localeSettings(): LocaleSettings {
  if (!current || (!hydrated && isBrowser())) {
    current = hydrate();
    hydrated = isBrowser();
  }
  return current;
}

/** Monotonic revision — the snapshot for `useSyncExternalStore`. */
export function localeSettingsRevision(): number {
  return revision;
}

export function subscribeLocaleSettings(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function commit(next: LocaleSettings): LocaleSettings {
  current = next;
  hydrated = true;
  revision += 1;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota or private mode */
    }
    window.dispatchEvent(new Event(EVENT));
  }
  return next;
}

export function updateLocaleSettings(patch: Partial<LocaleSettings>): LocaleSettings {
  return commit({ ...localeSettings(), ...patch });
}

/** Turn a language on or off in the public switcher. */
export function setLanguageEnabled(code: string, enabled: boolean): LocaleSettings {
  const settings = localeSettings();
  const set = new Set(settings.enabledLanguages);
  // English is the source language: it can never be switched off.
  if (code === "en") return settings;
  if (enabled) set.add(code);
  else set.delete(code);
  return updateLocaleSettings({ enabledLanguages: [...set] });
}

export function setCurrencyEnabled(code: string, enabled: boolean): LocaleSettings {
  const settings = localeSettings();
  const set = new Set(settings.enabledCurrencies);
  if (enabled) set.add(code);
  else set.delete(code);
  // Never leave the switcher with nothing to choose.
  if (set.size === 0) return settings;
  return updateLocaleSettings({ enabledCurrencies: [...set] });
}

export function addCustomLanguage(language: CustomLanguage): LocaleSettings {
  const settings = localeSettings();
  if (settings.custom.some((l) => l.code === language.code)) return settings;
  return updateLocaleSettings({ custom: [...settings.custom, language] });
}

export function removeCustomLanguage(code: string): LocaleSettings {
  const settings = localeSettings();
  const overrides = { ...settings.overrides };
  delete overrides[code];
  return commit({
    ...settings,
    custom: settings.custom.filter((l) => l.code !== code),
    enabledLanguages: settings.enabledLanguages.filter((c) => c !== code),
    overrides,
  });
}

/** Store (or clear, with an empty string) one translated string. */
export function setTranslation(language: string, source: string, value: string): LocaleSettings {
  const settings = localeSettings();
  const forLanguage = { ...(settings.overrides[language] ?? {}) };
  if (value.trim()) forLanguage[source] = value;
  else delete forLanguage[source];
  return updateLocaleSettings({
    overrides: { ...settings.overrides, [language]: forLanguage },
  });
}

/** Reset to the shipped languages, currencies and translations. */
export function resetLocaleSettings(): LocaleSettings {
  return commit(structuredClone(DEFAULT_LOCALE_SETTINGS));
}
