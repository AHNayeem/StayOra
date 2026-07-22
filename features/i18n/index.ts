/**
 * i18n barrel — locale preferences, formatters and the provider/hook the
 * public site consumes. Reference data (countries/currencies/languages) lives
 * in {@link "@/constants/geo"}.
 */
export { LocaleProvider, useLocale } from "./locale-provider";
export {
  useLocalePreferences,
  useSetLocale,
  setPreferences,
  DEFAULT_PREFERENCES,
  type LocalePreferences,
} from "./locale-store";
export {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
} from "./format";
