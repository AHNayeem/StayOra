import type { Attribute, AttributeInputType, AttributeStatus } from "./types";

const ATTRIBUTES: [string, string, AttributeInputType, number][] = [
  ["Property type", "Property", "select", 8],
  ["Star rating", "Property", "number", 0],
  ["Check-in time", "Policy", "text", 0],
  ["Check-out time", "Policy", "text", 0],
  ["Smoking allowed", "Policy", "boolean", 0],
  ["Bed type", "Room", "select", 5],
  ["Room size", "Room", "number", 0],
  ["View", "Room", "select", 6],
  ["Cancellation policy", "Policy", "select", 4],
  ["Floor level", "Room", "number", 0],
  ["Accessibility", "Property", "boolean", 0],
  ["Neighborhood", "Property", "text", 0],
  ["Max occupancy", "Room", "number", 0],
  ["Meal plan", "Policy", "select", 3],
];
const STATUSES: AttributeStatus[] = ["enabled", "disabled"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) + dayOffset * 86_400_000).toISOString();
}

export const ATTRIBUTES_SEED: Attribute[] = ATTRIBUTES.map(
  ([name, group, inputType, valuesCount], i) => ({
    id: `atr_${600 + i}`,
    name,
    group,
    inputType,
    valuesCount,
    status: STATUSES[i % STATUSES.length],
    updatedAt: iso((i * 6) % 80),
  }),
);
