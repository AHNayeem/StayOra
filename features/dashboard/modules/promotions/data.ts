import type { DiscountType, Promotion, PromotionStatus } from "./types";

const NAMES: [string, string][] = [
  ["Summer Escape", "SUMMER25"],
  ["Flash Weekend", "FLASH48"],
  ["Early Bird", "EARLY15"],
  ["Loyalty Bonus", "LOYAL10"],
  ["City Break", "CITY20"],
  ["Long Stay", "STAY7"],
  ["First Booking", "WELCOME"],
  ["Off-Peak", "OFFPEAK"],
];
const TYPES = ["Coupon", "Flash Sale", "Offer", "Referral"];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: PromotionStatus[] = ["scheduled", "active", "paused", "expired"];
const DISCOUNTS: DiscountType[] = ["percent", "fixed"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 5, 1) + dayOffset * 86_400_000).toISOString();
}

export const PROMOTIONS_SEED: Promotion[] = NAMES.map(([name, code], i) => {
  const discountType = DISCOUNTS[i % DISCOUNTS.length];
  return {
    id: `promo_${800 + i}`,
    code,
    name,
    type: TYPES[i % TYPES.length],
    discountType,
    value: discountType === "percent" ? 10 + (i % 5) * 5 : 25 + (i % 4) * 25,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    startsAt: iso((i * 4) % 30),
    endsAt: iso(((i * 4) % 30) + 21),
    redemptions: (i * 37) % 420,
  };
});
