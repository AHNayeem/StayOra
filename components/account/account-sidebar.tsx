"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCOUNT_NAV, type AccountBadgeKey, type AccountNavItem } from "@/features/account/nav";
import { useWishlistCount } from "@/features/account/wishlist";
import { useUnreadCount } from "@/features/account/notifications-store";
import { ACCOUNT_DATA } from "@/lib/mock/account-data";
import { cn } from "@/lib/utils";

/** Static counts derived once from the seed (messages / pending reviews). */
const UNREAD_MESSAGES = ACCOUNT_DATA.threads.reduce((sum, t) => sum + t.unread, 0);
const PENDING_REVIEWS = ACCOUNT_DATA.bookings.filter(
  (b) => b.status === "completed" && !b.reviewed,
).length;

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Resolves the live badge count for a nav item, or 0 when it has none. */
function useBadgeCounts(): Record<AccountBadgeKey, number> {
  const wishlist = useWishlistCount();
  const notifications = useUnreadCount();
  return {
    wishlist,
    notifications,
    messages: UNREAD_MESSAGES,
    reviews: PENDING_REVIEWS,
  };
}

export function AccountSidebar() {
  const pathname = usePathname();
  const counts = useBadgeCounts();

  return (
    <>
      {/* Mobile: horizontal scroller */}
      <nav
        aria-label="Account"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:hidden"
      >
        {ACCOUNT_NAV.flatMap((g) => g.items).map((item) => (
          <MobileItem
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            count={item.badge ? counts[item.badge] : 0}
          />
        ))}
      </nav>

      {/* Desktop: grouped sidebar */}
      <nav aria-label="Account" className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          {ACCOUNT_NAV.map((group) => (
            <div key={group.heading}>
              <p className="text-overline mb-2 px-3 text-muted">{group.heading}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <DesktopItem
                      item={item}
                      active={isActive(pathname, item.href)}
                      count={item.badge ? counts[item.badge] : 0}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

function DesktopItem({
  item,
  active,
  count,
}: {
  item: AccountNavItem;
  active: boolean;
  count: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary-50 text-primary"
          : "text-body hover:bg-surface-muted hover:text-ink",
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold",
            active ? "bg-primary text-white" : "bg-primary/10 text-primary",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function MobileItem({
  item,
  active,
  count,
}: {
  item: AccountNavItem;
  active: boolean;
  count: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-pill border px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-line bg-surface text-body",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
      {count > 0 && (
        <span
          className={cn(
            "grid min-w-4.5 place-items-center rounded-full px-1 text-[0.65rem] font-bold",
            active ? "bg-white/25 text-white" : "bg-primary/10 text-primary",
          )}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
