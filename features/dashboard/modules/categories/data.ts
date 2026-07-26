import type { Category, CategoryGroup, CategoryStatus } from "./types";

const CATEGORIES: [string, string, CategoryGroup, number][] = [
  ["Beach resorts", "beach-resorts", "Stays", 128],
  ["City hotels", "city-hotels", "Stays", 342],
  ["Mountain cabins", "mountain-cabins", "Stays", 76],
  ["Boutique stays", "boutique-stays", "Stays", 54],
  ["Guided tours", "guided-tours", "Experiences", 210],
  ["Food & wine", "food-and-wine", "Experiences", 88],
  ["Adventure sports", "adventure-sports", "Experiences", 63],
  ["Airport transfers", "airport-transfers", "Transport", 45],
  ["Car rentals", "car-rentals", "Transport", 132],
  ["Private drivers", "private-drivers", "Transport", 29],
  ["Visa assistance", "visa-assistance", "Services", 18],
  ["Travel insurance", "travel-insurance", "Services", 37],
  ["Concierge", "concierge", "Services", 12],
  ["Event planning", "event-planning", "Services", 9],
];
const STATUSES: CategoryStatus[] = ["active", "hidden"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 7, 1) + dayOffset * 86_400_000).toISOString();
}

export const CATEGORIES_SEED: Category[] = CATEGORIES.map(
  ([name, slug, group, itemsCount], i) => ({
    id: `cat_${700 + i}`,
    name,
    slug,
    group,
    itemsCount,
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 7) % 85),
  }),
);
