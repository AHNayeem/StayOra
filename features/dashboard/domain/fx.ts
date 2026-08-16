/**
 * Foreign exchange — quoting, locking and holding a rate.
 *
 * The data model always anticipated this: `Booking.fx` is an {@link FxSnapshot}
 * so a historical invoice never moves when today's rates do. Nothing populated
 * it, which meant a booking taken in AED was stored as USD with no record of
 * what the traveller actually saw. This file closes that loop:
 *
 *   quoteFx(currency)      → mid rate + platform spread, valid for N minutes
 *   lockFx(currency)       → the snapshot stored on the booking at checkout
 *   isFxLockExpired(snap)  → the checkout re-quotes rather than honouring a
 *                            stale rate, exactly as a real treasury desk would
 *   convertFromBase(...)   → base-currency amount → quoted currency
 *
 * Rates come from `constants/geo`'s `CURRENCIES` table — the same one the
 * public currency switcher uses — so there is no second, contradictory set of
 * numbers. A real integration replaces {@link midRate} with a rates feed and
 * leaves every caller untouched.
 */

import { CURRENCIES, findCurrency } from "@/constants/geo";
import { platformConfig } from "./platform-config";
import type { FxSnapshot } from "./types";

/** Currency the platform stores every amount in. */
export function baseCurrency(): string {
  return platformConfig().general.baseCurrency;
}

/** Currencies the platform can quote in. */
export function supportedCurrencies(): { code: string; name: string; symbol: string }[] {
  return CURRENCIES.map(({ code, name, symbol }) => ({ code, name, symbol }));
}

/**
 * Mid-market units of `currency` per 1 unit of base currency.
 *
 * Deterministic on purpose — the same rate on the server and the client, so a
 * price never flickers between render passes.
 */
export function midRate(currency: string): number {
  const base = baseCurrency();
  if (currency === base) return 1;
  const target = findCurrency(currency)?.rate;
  const origin = findCurrency(base)?.rate;
  if (!target || !origin) return 1;
  // The table is quoted against USD; cross-rate through it so a non-USD base
  // currency still works.
  return round(target / origin, 6);
}

function round(value: number, dp: number): number {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
}

export interface FxQuote {
  base: string;
  currency: string;
  /** Interbank rate before the platform's margin. */
  mid: number;
  /** Margin applied, percent. */
  spreadPercent: number;
  /** What the customer is charged at: `mid × (1 + spread)`. */
  rate: number;
  quotedAt: string;
  /** After this the rate must be re-quoted. */
  expiresAt: string;
}

/**
 * Quote a rate for display. The spread is the platform's FX margin — the same
 * number Finance sees in the Revenue Center.
 */
export function quoteFx(currency: string, nowMs = Date.now()): FxQuote {
  const { spreadPercent, lockMinutes } = platformConfig().fx;
  const base = baseCurrency();
  const mid = midRate(currency);
  const rate = currency === base ? 1 : round(mid * (1 + spreadPercent / 100), 6);
  return {
    base,
    currency,
    mid,
    spreadPercent: currency === base ? 0 : spreadPercent,
    rate,
    quotedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + lockMinutes * 60_000).toISOString(),
  };
}

/**
 * Lock a rate onto a booking. The returned snapshot is what gets stored, shown
 * on the voucher and used by every later refund calculation, so the customer's
 * paperwork always reads the same figure.
 */
export function lockFx(currency: string, nowMs = Date.now()): FxSnapshot | undefined {
  const quote = quoteFx(currency, nowMs);
  // Booking in the base currency needs no snapshot: there is nothing to hold.
  if (quote.currency === quote.base) return undefined;
  return {
    currency: quote.currency,
    rate: quote.rate,
    capturedAt: quote.quotedAt,
    baseCurrency: quote.base,
    mid: quote.mid,
    spreadPercent: quote.spreadPercent,
    expiresAt: quote.expiresAt,
    provider: "mock-fx",
  };
}

/** Has a locked rate aged out? The checkout re-quotes instead of honouring it. */
export function isFxLockExpired(snapshot: FxSnapshot | undefined, nowMs = Date.now()): boolean {
  if (!snapshot?.expiresAt) return false;
  return new Date(snapshot.expiresAt).getTime() < nowMs;
}

/** Convert a base-currency amount at a locked (or freshly quoted) rate. */
export function convertFromBase(amount: number, snapshot?: FxSnapshot): number {
  const rate = snapshot?.rate ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

/** Convert a quoted amount back to the base currency — used by refunds. */
export function convertToBase(amount: number, snapshot?: FxSnapshot): number {
  const rate = snapshot?.rate ?? 1;
  return Math.round((amount / rate) * 100) / 100;
}

/**
 * The FX margin the platform earned on a booking, in base currency.
 *
 * The customer pays at `rate`; the platform settles at `mid`. The difference on
 * the transaction value is the margin — small per booking, material in
 * aggregate, and the reason `spreadPercent` is a configurable number.
 */
export function fxMargin(amountInBase: number, snapshot?: FxSnapshot): number {
  if (!snapshot?.mid || !snapshot.rate) return 0;
  const marginRate = (snapshot.rate - snapshot.mid) / snapshot.rate;
  return Math.round(amountInBase * marginRate * 100) / 100;
}

/** Human label for a locked rate: `1 USD = 3.72 AED`. */
export function describeFx(snapshot: FxSnapshot): string {
  return `1 ${snapshot.baseCurrency ?? "USD"} = ${snapshot.rate} ${snapshot.currency}`;
}

/** The rate board shown in Finance → FX. */
export function fxRateBoard(nowMs = Date.now()): FxQuote[] {
  return CURRENCIES.map((c) => quoteFx(c.code, nowMs));
}

export const fxService = {
  quote: async (currency: string): Promise<FxQuote> => quoteFx(currency),
  board: async (): Promise<FxQuote[]> => fxRateBoard(),
  lock: async (currency: string): Promise<FxSnapshot | undefined> => lockFx(currency),
};
