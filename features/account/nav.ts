import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarCheck,
  CreditCard,
  FileText,
  Gift,
  Heart,
  History,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Star,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";

/** A count that can be shown as a badge next to a nav item. */
export type AccountBadgeKey = "messages" | "notifications" | "wishlist" | "reviews";

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
      { label: "Bookings", href: "/account/bookings", icon: CalendarCheck },
      { label: "Travel history", href: "/account/history", icon: History },
      { label: "Wishlist", href: "/account/wishlist", icon: Heart, badge: "wishlist" },
      { label: "Reviews", href: "/account/reviews", icon: Star, badge: "reviews" },
    ],
  },
  {
    heading: "Wallet",
    items: [
      { label: "Invoices", href: "/account/invoices", icon: FileText },
      { label: "Payments", href: "/account/payments", icon: Wallet },
      { label: "Saved cards", href: "/account/cards", icon: CreditCard },
      { label: "Coupons", href: "/account/coupons", icon: Ticket },
      { label: "Rewards", href: "/account/rewards", icon: Gift },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Messages", href: "/account/messages", icon: MessageSquare, badge: "messages" },
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
