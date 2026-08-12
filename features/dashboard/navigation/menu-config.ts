import type { MenuNode } from "./types";

/**
 * Dashboard menu — the DB-driven navigation source.
 *
 * Phase 1 ships this as a typed constant that stands in for the API payload
 * (Phase 3 swaps `getDashboardMenu()` for a fetch; the shape is identical).
 * Nothing about the sidebar is hardcoded in components: labels, order, nesting,
 * icons, badges and access rules all live here as data.
 *
 * Access fields (`permissions`, `anyPermission`, `featureFlag`) are evaluated
 * per user by {@link useDashboardMenu}; items the user cannot see are pruned.
 */
export const DASHBOARD_MENU: MenuNode[] = [
  {
    id: "overview",
    label: "Dashboard",
    icon: "LayoutDashboard",
    href: "/dashboard",
    anyPermission: ["dashboard:read"],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "LineChart",
    href: "/dashboard/analytics",
    anyPermission: ["analytics:read"],
    featureFlag: "analytics",
  },

  {
    id: "operations",
    label: "Bookings",
    icon: "CalendarCheck",
    href: "/dashboard/bookings",
    sectionStart: true,
    sectionLabel: "Operations",
    anyPermission: ["bookings:read"],
    badge: { countKey: "bookings.pending", variant: "accent" },
  },
  {
    id: "catalog",
    label: "Catalog",
    icon: "Boxes",
    anyPermission: ["catalog:read"],
    children: [
      { id: "catalog-hotels", label: "Hotels", href: "/dashboard/catalog/hotels" },
      { id: "catalog-apartments", label: "Apartments", href: "/dashboard/catalog/apartments" },
      { id: "catalog-resorts", label: "Resorts", href: "/dashboard/catalog/resorts" },
      { id: "catalog-shared-rooms", label: "Shared Rooms", href: "/dashboard/catalog/shared-rooms" },
      { id: "catalog-convention-hall", label: "Convention Hall", href: "/dashboard/catalog/convention-hall" },
      { id: "catalog-transport", label: "Transport", href: "/dashboard/catalog/transport" },
      { id: "catalog-activities", label: "Activities", href: "/dashboard/catalog/activities" },
      { id: "catalog-visa", label: "Visa", href: "/dashboard/catalog/visa" },
      {
        id: "catalog-taxonomy",
        label: "Taxonomy",
        children: [
          { id: "catalog-categories", label: "Categories", href: "/dashboard/catalog/categories" },
          { id: "catalog-amenities", label: "Amenities", href: "/dashboard/catalog/amenities" },
          { id: "catalog-attributes", label: "Attributes", href: "/dashboard/catalog/attributes" },
        ],
      },
    ],
  },
  {
    id: "flights",
    label: "Flights",
    icon: "Plane",
    anyPermission: ["flights:read"],
    badge: { countKey: "flights.pendingRefunds", variant: "accent" },
    children: [
      { id: "flights-overview", label: "Overview", href: "/dashboard/flights" },
      { id: "flights-bookings", label: "Bookings", href: "/dashboard/flights/bookings" },
      { id: "flights-passengers", label: "Passengers", href: "/dashboard/flights/passengers" },
      { id: "flights-refunds", label: "Refund Requests", href: "/dashboard/flights/refunds" },
      {
        id: "flights-inventory",
        label: "Inventory",
        children: [
          { id: "flights-airlines", label: "Airlines", href: "/dashboard/flights/airlines" },
          { id: "flights-airports", label: "Airports", href: "/dashboard/flights/airports" },
          { id: "flights-routes", label: "Routes", href: "/dashboard/flights/routes" },
          { id: "flights-schedules", label: "Schedules", href: "/dashboard/flights/schedules" },
        ],
      },
    ],
  },
  {
    id: "merchants",
    label: "Merchants",
    icon: "Store",
    href: "/dashboard/merchants",
    anyPermission: ["merchants:read"],
    badge: { countKey: "merchants.pendingApproval", variant: "danger" },
  },
  {
    id: "customers",
    label: "Customers",
    icon: "Users",
    href: "/dashboard/customers",
    anyPermission: ["customers:read"],
  },

  {
    id: "finance",
    label: "Finance",
    icon: "Wallet",
    sectionStart: true,
    sectionLabel: "Revenue",
    anyPermission: ["finance:read"],
    children: [
      {
        id: "finance-earnings",
        label: "My earnings",
        href: "/dashboard/finance/earnings",
        anyPermission: ["finance:read"],
      },
      { id: "finance-payments", label: "Payments", href: "/dashboard/finance/payments" },
      { id: "finance-transactions", label: "Transactions", href: "/dashboard/finance/transactions" },
      { id: "finance-wallet", label: "Wallet", href: "/dashboard/finance/wallet" },
      { id: "finance-invoices", label: "Invoices", href: "/dashboard/finance/invoices" },
      { id: "finance-payouts", label: "Payouts", href: "/dashboard/finance/payouts" },
      { id: "finance-refunds", label: "Refunds", href: "/dashboard/finance/refunds" },
      { id: "finance-commission", label: "Commission", href: "/dashboard/finance/commission" },
      { id: "finance-settlements", label: "Settlements", href: "/dashboard/finance/settlements" },
      { id: "finance-tax", label: "Tax", href: "/dashboard/finance/tax" },
      { id: "finance-reconciliation", label: "Reconciliation", href: "/dashboard/finance/reconciliation" },
      { id: "finance-disputes", label: "Disputes", href: "/dashboard/finance/disputes" },
    ],
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: "BadgePercent",
    anyPermission: ["promotions:read"],
    children: [
      { id: "promotions-offers", label: "Offers", href: "/dashboard/promotions/offers" },
      { id: "promotions-combos", label: "Combo Offers", href: "/dashboard/promotions/combos" },
      { id: "promotions-coupons", label: "Coupons", href: "/dashboard/promotions" },
      { id: "promotions-banners", label: "Banners", href: "/dashboard/promotions/banners" },
    ],
  },
  {
    id: "b2b",
    label: "B2B",
    icon: "Building2",
    anyPermission: ["b2b:read"],
    children: [
      { id: "b2b-overview", label: "Overview", href: "/dashboard/b2b" },
      { id: "b2b-accounts", label: "Accounts", href: "/dashboard/b2b/accounts" },
      { id: "b2b-bookings", label: "B2B Bookings", href: "/dashboard/b2b/bookings" },
      { id: "b2b-invoices", label: "Invoices", href: "/dashboard/b2b/invoices" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "FileBarChart",
    href: "/dashboard/reports",
    anyPermission: ["reports:read"],
  },

  {
    id: "content",
    label: "CMS",
    icon: "LayoutTemplate",
    sectionStart: true,
    sectionLabel: "Content",
    anyPermission: ["cms:read"],
    children: [
      { id: "cms-pages", label: "Pages", href: "/dashboard/cms" },
      { id: "cms-homepage", label: "Homepage", href: "/dashboard/cms/homepage" },
      { id: "cms-menus", label: "Menus", href: "/dashboard/cms/menus" },
      { id: "cms-media", label: "Media Library", href: "/dashboard/cms/media" },
      { id: "cms-testimonials", label: "Testimonials", href: "/dashboard/cms/testimonials" },
      { id: "cms-newsletter", label: "Newsletter", href: "/dashboard/cms/newsletter" },
      { id: "cms-seo", label: "SEO", href: "/dashboard/cms/seo" },
    ],
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: "Star",
    href: "/dashboard/reviews",
    anyPermission: ["reviews:read"],
    badge: { countKey: "reviews.pending", variant: "accent" },
  },
  {
    id: "localization",
    label: "Localization",
    icon: "Globe",
    href: "/dashboard/localization",
    anyPermission: ["localization:read"],
  },

  {
    id: "users",
    label: "Users",
    icon: "UserCog",
    href: "/dashboard/users",
    sectionStart: true,
    sectionLabel: "Access",
    anyPermission: ["users:read"],
  },
  {
    id: "roles",
    label: "Roles",
    icon: "ShieldCheck",
    href: "/dashboard/roles",
    anyPermission: ["roles:read"],
  },
  {
    id: "permissions",
    label: "Permissions",
    icon: "KeyRound",
    href: "/dashboard/permissions",
    anyPermission: ["permissions:read"],
  },

  {
    id: "system",
    label: "System",
    icon: "SlidersHorizontal",
    sectionStart: true,
    sectionLabel: "Platform",
    anyPermission: ["system:read", "settings:read"],
    children: [
      { id: "system-settings", label: "Settings", href: "/dashboard/settings", anyPermission: ["settings:read"] },
      { id: "system-templates", label: "Templates", href: "/dashboard/system/templates", anyPermission: ["system:read"] },
      { id: "system-logs", label: "Audit Logs", href: "/dashboard/logs", anyPermission: ["logs:read"] },
      { id: "system-login-logs", label: "Login Logs", href: "/dashboard/system/login-logs", anyPermission: ["logs:read"] },
      { id: "system-api-logs", label: "API Logs", href: "/dashboard/system/api-logs", anyPermission: ["logs:read"] },
      { id: "system-notifications", label: "Notifications", href: "/dashboard/notifications", anyPermission: ["notifications:read"] },
      { id: "system-cron", label: "Cron Jobs", href: "/dashboard/system/cron", anyPermission: ["system:read"] },
      { id: "system-queues", label: "Queues", href: "/dashboard/system/queues", anyPermission: ["system:read"] },
      { id: "system-cache", label: "Cache", href: "/dashboard/system/cache", anyPermission: ["system:read"] },
      { id: "system-storage", label: "Storage", href: "/dashboard/system/storage", anyPermission: ["system:read"] },
      { id: "system-maintenance", label: "Maintenance", href: "/dashboard/system/maintenance", anyPermission: ["system:update"] },
      { id: "system-design", label: "Design System", href: "/dashboard/design-system", anyPermission: ["system:read"] },
    ],
  },
  {
    id: "help",
    label: "Help",
    icon: "CircleHelp",
    href: "/dashboard/help",
    anyPermission: ["dashboard:read"],
  },
  {
    id: "support",
    label: "Support",
    icon: "LifeBuoy",
    href: "/dashboard/support",
    anyPermission: ["support:read"],
  },
  {
    id: "profile",
    label: "Profile",
    icon: "CircleUser",
    href: "/dashboard/profile",
    anyPermission: ["profile:read"],
  },
];

/**
 * Fetch the menu tree. Phase 1 returns the static config; Phase 3 replaces the
 * body with an API call. Kept async so callers are already written for it.
 */
export async function getDashboardMenu(): Promise<MenuNode[]> {
  return DASHBOARD_MENU;
}
