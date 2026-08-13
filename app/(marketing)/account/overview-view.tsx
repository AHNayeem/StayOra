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
import { AskAiButton } from "@/features/ai";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { useWishlistCount } from "@/features/account/wishlist";
import { useUnreadCount } from "@/features/account/notifications-store";
import { useCreatedBookings } from "@/features/account/created-bookings";
import {
  useCustomerBookings,
  useLoyalty,
  useUnreadCount as useInboxUnread,
  useWalletCoupons,
} from "@/features/booking";
import { AccountStat } from "@/components/account/account-stat";
import { AccountEmpty } from "@/components/account/account-empty";
import { BookingRow } from "@/components/account/booking-row";
import { buttonVariants } from "@/components/ui/button";

/**
 * Account overview.
 *
 * Trips, points and coupons come from the domain — the same records the
 * dashboard operates on — so this page and `/account/bookings` can never
 * disagree. `data` supplies only the parts that still live in the account seed
 * (message counts and the like), and flight/trip bookings are merged in from
 * their own store.
 */
export function OverviewView({ data }: { data: AccountOverview }) {
  const { user } = useAuth();
  const { money, number } = useLocale();
  const wishlistCount = useWishlistCount();
  const localUnread = useUnreadCount();
  const inboxUnread = useInboxUnread();
  const unreadNotifications = localUnread + inboxUnread;
  const created = useCreatedBookings();
  const domainBookings = useCustomerBookings();
  const loyalty = useLoyalty();
  const coupons = useWalletCoupons();
  const firstName = user?.name.split(" ")[0] ?? "traveler";

  const all = useMemo(
    () => dedupe([...domainBookings, ...created.map((c) => c.booking), ...data.recentBookings]),
    [domainBookings, created, data.recentBookings],
  );

  const upcoming = useMemo(
    () =>
      all
        .filter(
          (b) => b.status === "upcoming" || b.status === "checked_in" || b.status === "pending",
        )
        .sort((a, z) => a.checkIn.localeCompare(z.checkIn))
        .slice(0, 3),
    [all],
  );

  const recentBookings = useMemo(
    () => [...all].sort((a, z) => z.bookedAt.localeCompare(a.bookedAt)).slice(0, 4),
    [all],
  );

  /** Travel stats recomputed from the live booking set. */
  const stats = useMemo(() => {
    const completed = all.filter((b) => b.status === "completed");
    const cities = new Set(completed.map((b) => b.location.split(",")[0].trim()));
    const countries = new Set(
      completed.map((b) => b.location.split(",").pop()?.trim()).filter(Boolean),
    );
    return {
      trips: completed.length,
      countries: countries.size,
      cities: cities.size,
      nights: completed.reduce((sum, b) => sum + b.nights, 0),
      totalSpentUsd: completed.reduce((sum, b) => sum + b.totalUsd, 0),
    };
  }, [all]);

  const activeCoupons = coupons.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h3 text-ink">Welcome back, {firstName} 👋</h1>
          <p className="mt-1 text-body">Here&apos;s what&apos;s happening with your travels.</p>
        </div>
        {/* Contextual AI entry — the dashboard's most useful next action. */}
        <AskAiButton
          label="Plan my next trip"
          prompt="Plan my next trip"
          page={{
            label: "Your account",
            suggestions: [
              "What's my next trip?",
              "Show my bookings",
              "Plan my next trip",
              "Help me plan within my budget",
            ],
          }}
          variant="subtle"
        />
      </div>

      {/* Travel stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountStat label="Trips taken" value={stats.trips} icon={Plane} />
        <AccountStat label="Countries" value={stats.countries} icon={Globe} />
        <AccountStat label="Nights away" value={stats.nights} icon={Moon} />
        <AccountStat label="Total spent" value={money(stats.totalSpentUsd)} icon={Luggage} />
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
          value={number(loyalty.balance)}
          hint={`${loyalty.tier.name} tier`}
          icon={Gift}
          href="/account/rewards"
        />
        <AccountStat
          label="Active coupons"
          value={activeCoupons}
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
