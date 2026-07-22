/**
 * Internationalisation datasets — the "reference data" a real backend would
 * expose via `/countries`, `/currencies`, `/languages`, `/timezones`.
 *
 * Countries are stored as compact tuples and expanded into {@link Country}
 * objects (flag emoji derived from the ISO code), so the list stays readable
 * while covering the platform's global footprint. Currency rates are static
 * mock values relative to USD — good enough to make the currency switcher feel
 * real without a rates API.
 */

import type { Country, Currency, Language, Timezone } from "@/types/geo";

/** Convert an ISO 3166-1 alpha-2 code to its flag emoji (regional indicators). */
export function flagOf(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// [code, name, dialCode, currency, region]
type CountryTuple = [string, string, string, string, Country["region"]];

const COUNTRY_TUPLES: CountryTuple[] = [
  ["US", "United States", "+1", "USD", "Americas"],
  ["CA", "Canada", "+1", "CAD", "Americas"],
  ["MX", "Mexico", "+52", "MXN", "Americas"],
  ["BR", "Brazil", "+55", "BRL", "Americas"],
  ["AR", "Argentina", "+54", "ARS", "Americas"],
  ["CL", "Chile", "+56", "CLP", "Americas"],
  ["CO", "Colombia", "+57", "COP", "Americas"],
  ["PE", "Peru", "+51", "PEN", "Americas"],
  ["GB", "United Kingdom", "+44", "GBP", "Europe"],
  ["IE", "Ireland", "+353", "EUR", "Europe"],
  ["FR", "France", "+33", "EUR", "Europe"],
  ["DE", "Germany", "+49", "EUR", "Europe"],
  ["ES", "Spain", "+34", "EUR", "Europe"],
  ["PT", "Portugal", "+351", "EUR", "Europe"],
  ["IT", "Italy", "+39", "EUR", "Europe"],
  ["NL", "Netherlands", "+31", "EUR", "Europe"],
  ["BE", "Belgium", "+32", "EUR", "Europe"],
  ["CH", "Switzerland", "+41", "CHF", "Europe"],
  ["AT", "Austria", "+43", "EUR", "Europe"],
  ["SE", "Sweden", "+46", "SEK", "Europe"],
  ["NO", "Norway", "+47", "NOK", "Europe"],
  ["DK", "Denmark", "+45", "DKK", "Europe"],
  ["FI", "Finland", "+358", "EUR", "Europe"],
  ["PL", "Poland", "+48", "PLN", "Europe"],
  ["CZ", "Czechia", "+420", "CZK", "Europe"],
  ["GR", "Greece", "+30", "EUR", "Europe"],
  ["RU", "Russia", "+7", "RUB", "Europe"],
  ["UA", "Ukraine", "+380", "UAH", "Europe"],
  ["TR", "Türkiye", "+90", "TRY", "Europe"],
  ["AE", "United Arab Emirates", "+971", "AED", "Asia"],
  ["SA", "Saudi Arabia", "+966", "SAR", "Asia"],
  ["QA", "Qatar", "+974", "QAR", "Asia"],
  ["KW", "Kuwait", "+965", "KWD", "Asia"],
  ["BH", "Bahrain", "+973", "BHD", "Asia"],
  ["OM", "Oman", "+968", "OMR", "Asia"],
  ["JO", "Jordan", "+962", "JOD", "Asia"],
  ["LB", "Lebanon", "+961", "LBP", "Asia"],
  ["IL", "Israel", "+972", "ILS", "Asia"],
  ["EG", "Egypt", "+20", "EGP", "Africa"],
  ["MA", "Morocco", "+212", "MAD", "Africa"],
  ["TN", "Tunisia", "+216", "TND", "Africa"],
  ["ZA", "South Africa", "+27", "ZAR", "Africa"],
  ["NG", "Nigeria", "+234", "NGN", "Africa"],
  ["KE", "Kenya", "+254", "KES", "Africa"],
  ["GH", "Ghana", "+233", "GHS", "Africa"],
  ["ET", "Ethiopia", "+251", "ETB", "Africa"],
  ["TZ", "Tanzania", "+255", "TZS", "Africa"],
  ["IN", "India", "+91", "INR", "Asia"],
  ["PK", "Pakistan", "+92", "PKR", "Asia"],
  ["BD", "Bangladesh", "+880", "BDT", "Asia"],
  ["LK", "Sri Lanka", "+94", "LKR", "Asia"],
  ["NP", "Nepal", "+977", "NPR", "Asia"],
  ["CN", "China", "+86", "CNY", "Asia"],
  ["JP", "Japan", "+81", "JPY", "Asia"],
  ["KR", "South Korea", "+82", "KRW", "Asia"],
  ["HK", "Hong Kong", "+852", "HKD", "Asia"],
  ["TW", "Taiwan", "+886", "TWD", "Asia"],
  ["SG", "Singapore", "+65", "SGD", "Asia"],
  ["MY", "Malaysia", "+60", "MYR", "Asia"],
  ["TH", "Thailand", "+66", "THB", "Asia"],
  ["ID", "Indonesia", "+62", "IDR", "Asia"],
  ["PH", "Philippines", "+63", "PHP", "Asia"],
  ["VN", "Vietnam", "+84", "VND", "Asia"],
  ["MM", "Myanmar", "+95", "MMK", "Asia"],
  ["KH", "Cambodia", "+855", "KHR", "Asia"],
  ["MV", "Maldives", "+960", "MVR", "Asia"],
  ["AU", "Australia", "+61", "AUD", "Oceania"],
  ["NZ", "New Zealand", "+64", "NZD", "Oceania"],
  ["FJ", "Fiji", "+679", "FJD", "Oceania"],
];

/** Every supported country, sorted by name. */
export const COUNTRIES: Country[] = COUNTRY_TUPLES.map(
  ([code, name, dialCode, currency, region]) => ({
    code,
    name,
    dialCode,
    currency,
    region,
    flag: flagOf(code),
  }),
).sort((a, b) => a.name.localeCompare(b.name));

/** Currencies offered by the switcher; `rate` is 1 USD → this currency. */
export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1, locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79, locale: "en-GB" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67, locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75, locale: "ar-SA" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.2, locale: "en-IN" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", rate: 118, locale: "bn-BD" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 156, locale: "ja-JP" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.24, locale: "zh-CN" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.35, locale: "en-SG" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.52, locale: "en-AU" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.37, locale: "en-CA" },
  { code: "THB", name: "Thai Baht", symbol: "฿", rate: 36.5, locale: "th-TH" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rate: 4.72, locale: "ms-MY" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", rate: 32.3, locale: "tr-TR" },
];

/** UI languages. `ar` drives the RTL-ready architecture. */
export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  { code: "bn", name: "Bangla", nativeName: "বাংলা", dir: "ltr" },
  { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "zh", name: "Chinese", nativeName: "中文", dir: "ltr" },
  { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr" },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl" },
];

/** A representative spread of timezones for the timezone selector. */
export const TIMEZONES: Timezone[] = [
  { id: "America/Los_Angeles", label: "Pacific Time (US)", offset: "-08:00" },
  { id: "America/New_York", label: "Eastern Time (US)", offset: "-05:00" },
  { id: "America/Sao_Paulo", label: "Brasília Time", offset: "-03:00" },
  { id: "Europe/London", label: "Greenwich Mean Time", offset: "+00:00" },
  { id: "Europe/Paris", label: "Central European Time", offset: "+01:00" },
  { id: "Europe/Istanbul", label: "Türkiye Time", offset: "+03:00" },
  { id: "Asia/Dubai", label: "Gulf Standard Time", offset: "+04:00" },
  { id: "Asia/Karachi", label: "Pakistan Standard Time", offset: "+05:00" },
  { id: "Asia/Kolkata", label: "India Standard Time", offset: "+05:30" },
  { id: "Asia/Dhaka", label: "Bangladesh Standard Time", offset: "+06:00" },
  { id: "Asia/Bangkok", label: "Indochina Time", offset: "+07:00" },
  { id: "Asia/Singapore", label: "Singapore Time", offset: "+08:00" },
  { id: "Asia/Tokyo", label: "Japan Standard Time", offset: "+09:00" },
  { id: "Australia/Sydney", label: "Australian Eastern Time", offset: "+10:00" },
  { id: "Pacific/Auckland", label: "New Zealand Time", offset: "+12:00" },
];

/** Lookup helpers used by the locale layer. */
export const findCurrency = (code: string): Currency | undefined =>
  CURRENCIES.find((c) => c.code === code);
export const findCountry = (code: string): Country | undefined =>
  COUNTRIES.find((c) => c.code === code);
export const findLanguage = (code: string): Language | undefined =>
  LANGUAGES.find((l) => l.code === code);
