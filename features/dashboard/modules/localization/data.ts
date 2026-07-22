import type { Currency, Language } from "./types";

export const LANGUAGES_SEED: Language[] = [
  { id: "lng_en", code: "en", name: "English", nativeName: "English", rtl: false, coverage: 1, enabled: true },
  { id: "lng_ar", code: "ar", name: "Arabic", nativeName: "العربية", rtl: true, coverage: 0.92, enabled: true },
  { id: "lng_fr", code: "fr", name: "French", nativeName: "Français", rtl: false, coverage: 0.88, enabled: true },
  { id: "lng_de", code: "de", name: "German", nativeName: "Deutsch", rtl: false, coverage: 0.81, enabled: true },
  { id: "lng_es", code: "es", name: "Spanish", nativeName: "Español", rtl: false, coverage: 0.79, enabled: true },
  { id: "lng_ja", code: "ja", name: "Japanese", nativeName: "日本語", rtl: false, coverage: 0.64, enabled: false },
  { id: "lng_pt", code: "pt", name: "Portuguese", nativeName: "Português", rtl: false, coverage: 0.58, enabled: false },
  { id: "lng_he", code: "he", name: "Hebrew", nativeName: "עברית", rtl: true, coverage: 0.41, enabled: false },
];

export const CURRENCIES_SEED: Currency[] = [
  { id: "cur_usd", code: "USD", name: "US Dollar", symbol: "$", rate: 1, enabled: true },
  { id: "cur_eur", code: "EUR", name: "Euro", symbol: "€", rate: 0.92, enabled: true },
  { id: "cur_gbp", code: "GBP", name: "Pound Sterling", symbol: "£", rate: 0.79, enabled: true },
  { id: "cur_aed", code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67, enabled: true },
  { id: "cur_jpy", code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 157.2, enabled: false },
  { id: "cur_brl", code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 5.43, enabled: false },
];
