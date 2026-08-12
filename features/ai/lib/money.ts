/**
 * Money tokens — how the AI layer stays currency-agnostic.
 *
 * Tools and the engine deal in base USD (like every other price in the
 * platform), but an answer is prose: it has amounts *inside sentences*. Writing
 * "$1,500" there would hard-code USD into the copy and break the currency
 * switcher for everyone else.
 *
 * So amounts are emitted as `{{usd:1500}}` tokens and resolved at render time
 * through {@link "@/features/i18n".useLocale}'s `money()`, exactly like a
 * `<PriceTag>`. Switch the currency and every AI sentence reprices with the
 * rest of the page.
 */

const TOKEN = /\{\{usd:(-?\d+(?:\.\d+)?)\}\}/g;

/** Wrap a base-USD amount as a render-time money token. */
export function usd(amount: number): string {
  return `{{usd:${Math.round(amount)}}}`;
}

/** Replace every money token in a string using the active currency formatter. */
export function formatMoneyTokens(text: string, money: (amountUsd: number) => string): string {
  return text.replace(TOKEN, (_match, amount: string) => money(Number(amount)));
}
