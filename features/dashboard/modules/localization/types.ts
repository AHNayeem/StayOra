export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  /**
   * Translation coverage as a 0–1 ratio — *measured* from the dictionaries and
   * operator edits, never declared. See `features/i18n/dictionaries`.
   */
  coverage: number;
  enabled: boolean;
  /** Added at runtime rather than shipped with the app. */
  custom?: boolean;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  /** Exchange rate relative to the base currency. */
  rate: number;
  enabled: boolean;
}
