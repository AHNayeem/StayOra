import type { LucideIcon } from "lucide-react";
import {
  BanknoteArrowDown,
  Bell,
  CalendarCheck,
  CreditCard,
  Crown,
  FileText,
  Gift,
  Heart,
  History,
  LifeBuoy,
  LayoutDashboard,
  Luggage,
  MessageSquare,
  Plane,
  Settings,
  Shield,
  Star,
  Search,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";

/** A count that can be shown as a badge next to a nav item. */
export type AccountBadgeKey =
  | "messages"
  | "notifications"
  | "wishlist"
  | "searches"
  | "reviews"
  | "support";

export interface AccountNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Which live count to render as a badge, if any. */
  badge?: AccountBadgeKey;
}

export interface AccountNavGroup {
  heading: string;
  items: AccountNavItem[];
}

/**
 * The traveler account navigation, grouped for the sidebar. Order is the
 * information architecture of `/account/*` — trips first, then wallet, then
 * profile/settings. Every href resolves to a real page.
 */
export const ACCOUNT_NAV: AccountNavGroup[] = [
  {
    heading: "Trips",
    items: [
      { label: "Overview", href: "/account", icon: LayoutDashboard },
      { label: "My trips", href: "/account/trips", icon: Luggage },
      { label: "Bookings", href: "/account/bookings", icon: CalendarCheck },
      { label: "My flights", href: "/account/flights", icon: Plane },
      { label: "Travel history", href: "/account/history", icon: History },
      { label: "Wishlist", href: "/account/wishlist", icon: Heart, badge: "wishlist" },
      { label: "Saved searches", href: "/account/searches", icon: Search, badge: "searches" },
      { label: "Reviews", href: "/account/reviews", icon: Star, badge: "reviews" },
    ],
  },
  {
    heading: "Wallet",
    items: [
      { label: "Invoices", href: "/account/invoices", icon: FileText },
      { label: "Refunds", href: "/account/refunds", icon: BanknoteArrowDown },
      { label: "Payments", href: "/account/payments", icon: Wallet },
      { label: "Saved cards", href: "/account/cards", icon: CreditCard },
      { label: "Coupons", href: "/account/coupons", icon: Ticket },
      { label: "Rewards", href: "/account/rewards", icon: Gift },
      { label: "Membership", href: "/account/membership", icon: Crown },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Messages", href: "/account/messages", icon: MessageSquare, badge: "messages" },
      { label: "Help & support", href: "/account/support", icon: LifeBuoy, badge: "support" },
      { label: "Notifications", href: "/account/notifications", icon: Bell, badge: "notifications" },
      { label: "Profile", href: "/account/profile", icon: User },
      { label: "Saved travelers", href: "/account/travelers", icon: Users },
      { label: "Settings", href: "/account/settings", icon: Settings },
      { label: "Security", href: "/account/security", icon: Shield },
    ],
  },
];

/** Flat list of every account nav item (for breadcrumbs / active matching). */
export const ACCOUNT_NAV_FLAT: AccountNavItem[] = ACCOUNT_NAV.flatMap((g) => g.items);
