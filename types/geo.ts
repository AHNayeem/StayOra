/**
 * Internationalisation domain types — countries, currencies, languages and
 * timezones. These describe the data the locale/currency layer and the various
 * selectors (country picker, currency switcher, phone input) consume.
 */

/** Text direction; RTL languages flip the document `dir`. */
export type TextDirection = "ltr" | "rtl";

/** A country entry used by selectors, phone inputs and address forms. */
export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  code: string;
  name: string;
  /** International dialing prefix, e.g. "+1". */
  dialCode: string;
  /** Default currency code (ISO 4217) for the country. */
  currency: string;
  /** Broad region for grouping in UI. */
  region: "Africa" | "Americas" | "Asia" | "Europe" | "Oceania";
  /** Flag emoji, derived from the country code. */
  flag: string;
}

/** A currency and its display + conversion metadata. */
export interface Currency {
  /** ISO 4217 code, e.g. "USD". */
  code: string;
  name: string;
  symbol: string;
  /** Mock conversion rate relative to USD (1 USD = `rate` of this currency). */
  rate: number;
  /** BCP-47 locale used to format amounts in this currency. */
  locale: string;
}

/** A UI language. */
export interface Language {
  /** BCP-47 / ISO 639-1 code, e.g. "en". */
  code: string;
  name: string;
  nativeName: string;
  dir: TextDirection;
}

/** A selectable timezone. */
export interface Timezone {
  /** IANA identifier, e.g. "Asia/Dhaka". */
  id: string;
  label: string;
  /** UTC offset label, e.g. "+06:00". */
  offset: string;
}
