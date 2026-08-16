/**
 * Locale-aware formatters. Pure functions: given the active currency/language
 * they turn base USD amounts and ISO dates into localized strings. The UI reads
 * them through {@link "./use-locale".useLocale} so switching currency or
 * language reformats everything at once.
 *
 * `Intl.NumberFormat` / `Intl.DateTimeFormat` construction is orders of
 * magnitude more expensive than calling `.format()` on an existing instance,
 * and these run per row: a map view renders a price for every marker *and*
 * every result row, and a dashboard table formats a currency and two dates per
 * booking. Instances are therefore cached by locale + options, which is safe
 * because they are immutable and stateless.
 */

import type { Currency } from "@/types/geo";

/** Currencies that conventionally display no decimal places. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "IDR"]);

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function dateFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Format a base-currency amount in the active currency. Prices across the
 * catalog are stored in the platform's base currency; this is the single place
 * conversion happens.
 *
 * `rate` lets the caller pass the platform's *quoted* rate (mid + FX spread,
 * from `domain/fx.ts`) so what a traveller browses at is exactly what checkout
 * locks. Without it the plain reference rate from `constants/geo` is used.
 */
export function formatMoney(
  amountUsd: number,
  currency: Currency,
  options: Intl.NumberFormatOptions = {},
  rate?: number,
): string {
  const converted = amountUsd * (rate ?? currency.rate);
  const fractionDigits = ZERO_DECIMAL.has(currency.code) ? 0 : undefined;
  return numberFormatter(currency.locale, {
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
  return numberFormatter(locale, options).format(value);
}

/** Format an ISO date string for the active language. */
export function formatDate(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter(locale, options).format(date);
}

/** Format an ISO date + time for the active language. */
export function formatDateTime(iso: string, locale: string): string {
  return formatDate(iso, locale, { dateStyle: "medium", timeStyle: "short" });
}
