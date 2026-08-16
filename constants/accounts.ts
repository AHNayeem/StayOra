/**
 * Seed accounts for the mock auth service. These are the credentials that
 * "already exist" in the fake backend; newly-registered users are appended to
 * localStorage at runtime. A real backend replaces this with a users table —
 * the {@link AuthUser} shape is unchanged.
 *
 * Each account carries the dashboard role it maps to (`dashboardRole`) plus the
 * merchant/B2B account it is scoped to, so one sign-in drives both the public
 * site and the dashboard's RBAC — and the prototype can demonstrate every role
 * boundary the brief calls for.
 */

import type { AuthUser } from "@/types/account";
import { DEMO_B2B_ACCOUNT_ID, DEMO_MERCHANT_ID } from "@/features/dashboard/domain/seed";

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
    email: "traveler@otithee.com",
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
    email: "merchant@otithee.com",
    password: DEMO_PASSWORD,
    role: "merchant",
    dashboardRole: "merchant",
    merchantId: DEMO_MERCHANT_ID,
    avatar: "https://i.pravatar.cc/160?img=12",
    phone: "+44 20 7946 0321",
    country: "GB",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "platinum",
    points: 12040,
    createdAt: "2024-11-02T14:05:00.000Z",
  },
  /**
   * Two merchant staff accounts under the *same* merchant as the owner above.
   *
   * They exist so the merchant-side role boundary is demonstrable rather than
   * merely designed: signing in as either shows the same merchant's data with
   * strictly less access than Marco's owner account.
   */
  {
    id: "usr_merchant_manager_demo",
    name: "Lina Haddad",
    email: "manager@otithee.com",
    password: DEMO_PASSWORD,
    role: "merchant",
    dashboardRole: "merchant",
    merchantId: DEMO_MERCHANT_ID,
    merchantRole: "manager",
    avatar: "https://i.pravatar.cc/160?img=26",
    phone: "+971 4 555 0188",
    country: "AE",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "gold",
    points: 0,
    createdAt: "2025-02-04T09:00:00.000Z",
  },
  {
    id: "usr_merchant_frontdesk_demo",
    name: "Yusuf Ali",
    email: "frontdesk@otithee.com",
    password: DEMO_PASSWORD,
    role: "merchant",
    dashboardRole: "merchant",
    merchantId: DEMO_MERCHANT_ID,
    merchantRole: "front_desk",
    avatar: "https://i.pravatar.cc/160?img=59",
    phone: "+971 4 555 0199",
    country: "AE",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-06-18T09:00:00.000Z",
  },
  {
    id: "usr_admin_demo",
    name: "Sana Rahman",
    email: "admin@otithee.com",
    password: DEMO_PASSWORD,
    role: "admin",
    dashboardRole: "admin",
    avatar: "https://i.pravatar.cc/160?img=32",
    phone: "+880 1711 000000",
    country: "BD",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "platinum",
    points: 0,
    createdAt: "2024-08-19T08:00:00.000Z",
  },
  {
    id: "usr_super_demo",
    name: "AH Nayeem",
    email: "superadmin@otithee.com",
    password: DEMO_PASSWORD,
    role: "admin",
    dashboardRole: "super_admin",
    avatar: "https://i.pravatar.cc/160?img=68",
    phone: "+880 1711 111111",
    country: "BD",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "platinum",
    points: 0,
    createdAt: "2024-06-01T08:00:00.000Z",
  },
  {
    id: "usr_agency_demo",
    name: "Rezaul Karim",
    email: "agency@otithee.com",
    password: DEMO_PASSWORD,
    role: "agency",
    dashboardRole: "agency",
    organizationId: DEMO_B2B_ACCOUNT_ID,
    avatar: "https://i.pravatar.cc/160?img=15",
    phone: "+880 1711 445566",
    country: "BD",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "platinum",
    points: 0,
    createdAt: "2025-01-14T08:00:00.000Z",
  },
  {
    id: "usr_finance_demo",
    name: "Priya Nair",
    email: "finance@otithee.com",
    password: DEMO_PASSWORD,
    role: "staff",
    dashboardRole: "finance",
    avatar: "https://i.pravatar.cc/160?img=45",
    phone: "+91 22 4004 8800",
    country: "IN",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-02-20T08:00:00.000Z",
  },
  {
    id: "usr_support_demo",
    name: "Tariq Aziz",
    email: "support@otithee.com",
    password: DEMO_PASSWORD,
    role: "staff",
    dashboardRole: "support",
    avatar: "https://i.pravatar.cc/160?img=53",
    phone: "+971 4 555 0110",
    country: "AE",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-04-02T08:00:00.000Z",
  },
  /**
   * The remaining dashboard roles.
   *
   * `vendor`, `marketing` and `content_manager` were fully defined but had no
   * seed account, so three of the platform's roles could never be demonstrated —
   * and `compliance`, `auditor` and `b2b_agent` are new. Every role the RBAC
   * layer knows now has a way in.
   */
  {
    id: "usr_vendor_demo",
    name: "Hasan Chowdhury",
    email: "vendor@otithee.com",
    password: DEMO_PASSWORD,
    role: "merchant",
    dashboardRole: "vendor",
    merchantId: DEMO_MERCHANT_ID,
    merchantRole: "reservations",
    avatar: "https://i.pravatar.cc/160?img=11",
    phone: "+880 1711 223344",
    country: "BD",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-05-06T08:00:00.000Z",
  },
  {
    id: "usr_marketing_demo",
    name: "Dana Sørensen",
    email: "marketing@otithee.com",
    password: DEMO_PASSWORD,
    role: "staff",
    dashboardRole: "marketing",
    avatar: "https://i.pravatar.cc/160?img=24",
    phone: "+45 33 55 0100",
    country: "DK",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "silver",
    points: 0,
    createdAt: "2025-03-18T08:00:00.000Z",
  },
  {
    id: "usr_content_demo",
    name: "Omar Haddad",
    email: "content@otithee.com",
    password: DEMO_PASSWORD,
    role: "staff",
    dashboardRole: "content_manager",
    avatar: "https://i.pravatar.cc/160?img=60",
    phone: "+971 4 555 0177",
    country: "AE",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-03-25T08:00:00.000Z",
  },
  {
    id: "usr_compliance_demo",
    name: "Ingrid Vogel",
    email: "compliance@otithee.com",
    password: DEMO_PASSWORD,
    role: "staff",
    dashboardRole: "compliance",
    avatar: "https://i.pravatar.cc/160?img=41",
    phone: "+49 30 5550 0142",
    country: "DE",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-06-02T08:00:00.000Z",
  },
  {
    id: "usr_auditor_demo",
    name: "Peter Lund",
    email: "auditor@otithee.com",
    password: DEMO_PASSWORD,
    role: "staff",
    dashboardRole: "auditor",
    avatar: "https://i.pravatar.cc/160?img=13",
    phone: "+46 8 555 0166",
    country: "SE",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-06-20T08:00:00.000Z",
  },
  {
    id: "usr_b2b_agent_demo",
    name: "Farah Islam",
    email: "b2bagent@otithee.com",
    password: DEMO_PASSWORD,
    role: "agency",
    dashboardRole: "b2b_agent",
    organizationId: DEMO_B2B_ACCOUNT_ID,
    avatar: "https://i.pravatar.cc/160?img=31",
    phone: "+880 1711 778899",
    country: "BD",
    emailVerified: true,
    profileComplete: true,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: "2025-07-08T08:00:00.000Z",
  },
];

/** Demo credentials advertised on the sign-in screen, in presentation order. */
export const DEMO_ACCOUNT_HINTS: {
  label: string;
  email: string;
  lands: string;
  note: string;
}[] = [
  {
    label: "Customer",
    email: "traveler@otithee.com",
    lands: "/account",
    note: "Trips, refunds, invoices",
  },
  {
    label: "Merchant",
    email: "merchant@otithee.com",
    lands: "/dashboard",
    note: "Own inventory, bookings & earnings",
  },
  {
    label: "Merchant staff",
    email: "frontdesk@otithee.com",
    lands: "/dashboard",
    note: "Same merchant, front-desk access only",
  },
  {
    label: "Admin",
    email: "admin@otithee.com",
    lands: "/dashboard",
    note: "Full platform management",
  },
  {
    label: "Super Admin",
    email: "superadmin@otithee.com",
    lands: "/dashboard",
    note: "Everything, incl. system settings",
  },
  {
    label: "Agency (B2B)",
    email: "agency@otithee.com",
    lands: "/dashboard/b2b",
    note: "Net rates, credit, consolidated invoices",
  },
  {
    label: "Finance",
    email: "finance@otithee.com",
    lands: "/dashboard/finance/commission",
    note: "Refunds, commission, settlements",
  },
  {
    label: "Support",
    email: "support@otithee.com",
    lands: "/dashboard/bookings",
    note: "Bookings & customer records only",
  },
  {
    label: "Compliance / KYC",
    email: "compliance@otithee.com",
    lands: "/dashboard",
    note: "Approves merchant onboarding; no money access",
  },
  {
    label: "Auditor",
    email: "auditor@otithee.com",
    lands: "/dashboard",
    note: "Reads everything, changes nothing",
  },
  {
    label: "B2B agent",
    email: "b2bagent@otithee.com",
    lands: "/dashboard/b2b",
    note: "Books for the agency without seeing its finances",
  },
  {
    label: "Vendor",
    email: "vendor@otithee.com",
    lands: "/dashboard",
    note: "Supplies inventory; catalog read/update only",
  },
  {
    label: "Marketing",
    email: "marketing@otithee.com",
    lands: "/dashboard",
    note: "Promotions, campaigns and content",
  },
  {
    label: "Content manager",
    email: "content@otithee.com",
    lands: "/dashboard",
    note: "CMS, localization and review moderation",
  },
];

/** Where a role lands after signing in. */
export function homeRouteForRole(role: AuthUserRole): string {
  switch (role) {
    case "traveler":
      return "/account";
    case "agency":
      return "/dashboard/b2b";
    case "merchant":
    case "admin":
    case "staff":
      return "/dashboard";
    default:
      return "/";
  }
}

type AuthUserRole = AuthUser["role"];
