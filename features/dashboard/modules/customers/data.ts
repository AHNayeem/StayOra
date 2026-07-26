import type { Customer, CustomerStatus } from "./types";

const NAMES = [
  "Liam Carter", "Sofia Alvarez", "Noah Kim", "Emma Novak", "Arjun Mehta",
  "Chloe Dubois", "Mateo Rossi", "Aisha Rahman", "Lucas Silva", "Yuki Tanaka",
  "Olivia Brooks", "Omar Haddad", "Freya Larsen", "Diego Torres", "Hannah Weber",
  "Ivan Petrov", "Mia Andersson", "Kofi Mensah", "Priya Nair", "Ethan Walsh",
];
const COUNTRIES = [
  "United States", "United Kingdom", "United Arab Emirates", "Germany",
  "Japan", "Brazil", "France", "Sweden",
];
const CURRENCIES = ["USD", "GBP", "AED", "EUR"];
const STATUSES: CustomerStatus[] = ["active", "active", "active", "inactive", "blocked"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2025, 8, 1) + dayOffset * 86_400_000).toISOString();
}

export const CUSTOMERS_SEED: Customer[] = NAMES.map((name, i) => {
  const handle = name.toLowerCase().replace(/[^a-z]+/g, ".");
  return {
    id: `cus_${700 + i}`,
    name,
    email: `${handle}@example.com`,
    phone: `+1 (555) ${String(100 + i).padStart(3, "0")}-${String(2000 + i * 7).slice(0, 4)}`,
    country: COUNTRIES[i % COUNTRIES.length],
    bookings: (i * 3) % 19,
    totalSpent: 120 + (i % 12) * 340,
    currency: CURRENCIES[i % CURRENCIES.length],
    status: STATUSES[i % STATUSES.length],
    joinedAt: iso((i * 11) % 300),
  };
});
