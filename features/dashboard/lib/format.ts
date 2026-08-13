/**
 * Locale-aware formatters shared across dashboard modules.
 *
 * Currency and locale are always passed in (never hardcoded), so the same
 * helpers serve any tenant's currency/locale. They degrade gracefully on bad
 * input rather than throwing inside a cell renderer.
 *
 * These are cell renderers: a 50-row table with a currency column and two date
 * columns calls them 150 times per render, and constructing an `Intl` formatter
 * costs far more than formatting with one. Instances are cached by locale +
 * options — they are immutable and stateless, so sharing them is safe.
 */

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

function dateFormatter(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    dateFormatters.set(key, formatter);
  }
  return formatter;
}

/** Format a numeric amount as currency. `currency` is an ISO 4217 code. */
export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string,
): string {
  try {
    return numberFormatter(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Format a plain number with grouping. */
export function formatNumber(value: number, locale?: string): string {
  try {
    return numberFormatter(locale, {}).format(value);
  } catch {
    return String(value);
  }
}

/** Format an ISO date string as a short date (e.g. "22 Jul 2026"). */
export function formatDate(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Format an ISO date string as date + time. */
export function formatDateTime(iso: string, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Format a 0–1 (or 0–100) ratio as a percentage. */
export function formatPercent(
  value: number,
  { fromRatio = true, locale }: { fromRatio?: boolean; locale?: string } = {},
): string {
  const ratio = fromRatio ? value : value / 100;
  try {
    return numberFormatter(locale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(ratio);
  } catch {
    return `${Math.round(ratio * 100)}%`;
  }
}
