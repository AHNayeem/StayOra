import { createStubService } from "../../crud";
import type { Currency, Language } from "./types";
import { CURRENCIES_SEED, LANGUAGES_SEED } from "./data";

/** Languages data source (in-memory stub; repository-ready). */
export const languagesService = createStubService<
  Language,
  Omit<Language, "id">,
  Partial<Language>
>({
  seed: LANGUAGES_SEED,
  getId: (row) => row.id,
  searchFields: ["code", "name", "nativeName"],
  idPrefix: "lng",
});

/** Currencies data source (in-memory stub; repository-ready). */
export const currenciesService = createStubService<
  Currency,
  Omit<Currency, "id">,
  Partial<Currency>
>({
  seed: CURRENCIES_SEED,
  getId: (row) => row.id,
  searchFields: ["code", "name"],
  idPrefix: "cur",
});

export const localizationKeys = {
  languages: ["localization", "languages"] as const,
  currencies: ["localization", "currencies"] as const,
};
