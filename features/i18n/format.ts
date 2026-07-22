/**
 * Locale-aware formatters. Pure functions: given the active currency/language
 * they turn base USD amounts and ISO dates into localized strings. The UI reads
 * them through {@link "./use-locale".useLocale} so switching currency or
 * language reformats everything at once.
 */

import type { Currency } from "@/types/geo";

/** Currencies that conventionally display no decimal places. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "IDR"]);

/**
 * Format a base-USD amount in the active currency, converting via the mock
 * rate. Prices across the catalog are stored in USD; this is the single place
 * conversion happens.
 */
export function formatMoney(
  amountUsd: number,
  currency: Currency,
  options: Intl.NumberFormatOptions = {},
): string {
  const converted = amountUsd * currency.rate;
  const fractionDigits = ZERO_DECIMAL.has(currency.code) ? 0 : undefined;
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: fractionDigits ?? 0,
    ...options,
  }).format(converted);
}

/** Format a plain number for the active language. */
export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Format an ISO date string for the active language. */
export function formatDate(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Format an ISO date + time for the active language. */
export function formatDateTime(iso: string, locale: string): string {
  return formatDate(iso, locale, { dateStyle: "medium", timeStyle: "short" });
}
