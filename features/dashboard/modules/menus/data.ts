import type { MenuItem, MenuLocation } from "./types";

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

/** [label, location, url, visible] — order is derived per location below. */
const ITEMS: [string, MenuLocation, string, boolean][] = [
  ["Hotels", "header", "/hotels", true],
  ["Apartments", "header", "/apartments", true],
  ["Resorts", "header", "/resorts", true],
  ["Transport", "header", "/transport", true],
  ["Activities", "header", "/activities", true],
  ["Visa", "header", "/visa", false],
  ["About us", "footer", "/about", true],
  ["Careers", "footer", "/careers", true],
  ["Blog", "footer", "/blogs", true],
  ["Partners", "footer", "/partners", true],
  ["Help center", "footer", "/help", true],
  ["Contact", "footer", "/contact", true],
  ["Terms of service", "legal", "/terms", true],
  ["Privacy policy", "legal", "/privacy", true],
  ["Cookie policy", "legal", "/cookies", true],
  ["Refund policy", "legal", "/refunds", false],
];

const orderByLocation: Record<MenuLocation, number> = {
  header: 0,
  footer: 0,
  legal: 0,
};

export const MENU_ITEMS_SEED: MenuItem[] = ITEMS.map(
  ([label, location, url, visible], i) => ({
    id: `menu_${700 + i}`,
    label,
    location,
    url,
    order: orderByLocation[location]++,
    visible,
    updatedAt: iso((i * 5) % 70),
  }),
);
