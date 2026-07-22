export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  /** Translation coverage as a 0–1 ratio. */
  coverage: number;
  enabled: boolean;
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
