"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Gift,
  Globe,
  Heart,
  Luggage,
  MapPinned,
  Moon,
  Plane,
  Ticket,
} from "lucide-react";
import { useMemo } from "react";
import type { AccountOverview, TravelerBooking } from "@/types/traveler";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { useWishlistCount } from "@/features/account/wishlist";
import { useUnreadCount } from "@/features/account/notifications-store";
import { useCreatedBookings } from "@/features/account/created-bookings";
import { AccountStat } from "@/components/account/account-stat";
import { AccountEmpty } from "@/components/account/account-empty";
import { BookingRow } from "@/components/account/booking-row";
import { buttonVariants } from "@/components/ui/button";

export function OverviewView({ data }: { data: AccountOverview }) {
  const { user } = useAuth();
  const { money, number } = useLocale();
  const wishlistCount = useWishlistCount();
  const unreadNotifications = useUnreadCount();
  const created = useCreatedBookings();
  const firstName = user?.name.split(" ")[0] ?? "traveler";

  // Fold checkout-created bookings into the upcoming + recent lists.
  const upcoming = useMemo(() => {
    const fresh = created
      .map((c) => c.booking)
      .filter((b) => b.status === "upcoming" || b.status === "pending");
    return dedupe([...fresh, ...data.upcoming]).slice(0, 3);
  }, [created, data.upcoming]);

  const recentBookings = useMemo(
    () => dedupe([...created.map((c) => c.booking), ...data.recentBookings]).slice(0, 4),
    [created, data.recentBookings],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h3 text-ink">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-body">Here&apos;s what&apos;s happening with your travels.</p>
      </div>

      {/* Travel stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountStat label="Trips taken" value={data.stats.trips} icon={Plane} />
        <AccountStat label="Countries" value={data.stats.countries} icon={Globe} />
        <AccountStat label="Nights away" value={data.stats.nights} icon={Moon} />
        <AccountStat label="Total spent" value={money(data.stats.totalSpentUsd)} icon={Luggage} />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountStat
          label="Wishlist"
          value={wishlistCount}
          icon={Heart}
          href="/account/wishlist"
        />
        <AccountStat
          label="Reward points"
          value={number(data.rewards.balance)}
          hint={`${data.rewards.tier} tier`}
          icon={Gift}
          href="/account/rewards"
        />
        <AccountStat
          label="Active coupons"
          value={data.activeCoupons}
          icon={Ticket}
          href="/account/coupons"
        />
        <AccountStat
          label="Notifications"
          value={unreadNotifications}
          hint={unreadNotifications > 0 ? "unread" : "all caught up"}
          icon={Bell}
          href="/account/notifications"
        />
      </div>

      {/* Upcoming trips */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Upcoming trips</h2>
          <Link
            href="/account/bookings"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            All bookings
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid gap-3">
            {upcoming.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <AccountEmpty
            icon={MapPinned}
            title="No upcoming trips"
            description="When you book your next stay, tour or experience it'll show up here."
            action={
              <Link href="/" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Explore stays
              </Link>
            }
          />
        )}
      </section>

      {/* Recent activity */}
      {recentBookings.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-ink">Recent activity</h2>
          <div className="grid gap-3">
            {recentBookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** De-duplicate bookings by id, keeping first occurrence (created first). */
function dedupe(bookings: TravelerBooking[]): TravelerBooking[] {
  const seen = new Set<string>();
  return bookings.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}
