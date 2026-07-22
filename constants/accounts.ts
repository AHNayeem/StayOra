/**
 * Seed accounts for the mock auth service. These are the credentials that
 * "already exist" in the fake backend; newly-registered users are appended to
 * localStorage at runtime. A real backend replaces this with a users table —
 * the {@link AuthUser} shape is unchanged.
 */

import type { AuthUser } from "@/types/account";

/** An account record including the (mock) password the service checks against. */
export interface MockAccount extends AuthUser {
  password: string;
}

/** Shared demo password so the sign-in screen can advertise a one-click login. */
export const DEMO_PASSWORD = "Passw0rd!";

export const SEED_ACCOUNTS: MockAccount[] = [
  {
    id: "usr_traveler_demo",
    name: "Ava Thompson",
    email: "traveler@stayora.com",
    password: DEMO_PASSWORD,
    role: "traveler",
    avatar: "https://i.pravatar.cc/160?img=47",
    phone: "+1 415 555 0142",
    country: "US",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "gold",
    points: 4820,
    createdAt: "2025-03-11T09:24:00.000Z",
  },
  {
    id: "usr_merchant_demo",
    name: "Marco Silva",
    email: "merchant@stayora.com",
    password: DEMO_PASSWORD,
    role: "merchant",
    avatar: "https://i.pravatar.cc/160?img=12",
    phone: "+44 20 7946 0321",
    country: "GB",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "platinum",
    points: 12040,
    createdAt: "2024-11-02T14:05:00.000Z",
  },
  {
    id: "usr_admin_demo",
    name: "Sana Rahman",
    email: "admin@stayora.com",
    password: DEMO_PASSWORD,
    role: "admin",
    avatar: "https://i.pravatar.cc/160?img=32",
    phone: "+880 1711 000000",
    country: "BD",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "platinum",
    points: 0,
    createdAt: "2024-08-19T08:00:00.000Z",
  },
];
