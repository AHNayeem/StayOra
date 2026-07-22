"use client";

import Link from "next/link";
import { Globe, MapPin, Moon, Plane, Wallet } from "lucide-react";
import type { TravelStats, TravelerBooking } from "@/types/traveler";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { AccountStat } from "@/components/account/account-stat";
import { BookingRow } from "@/components/account/booking-row";
import { buttonVariants } from "@/components/ui/button";

interface Props {
  history: TravelerBooking[];
  stats: TravelStats;
}

export function HistoryView({ history, stats }: Props) {
  const { money } = useLocale();

  return (
    <div>
      <AccountPageHeader
        title="Travel history"
        description="Every completed trip, and the memories that add up."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AccountStat label="Trips taken" value={stats.trips} icon={Plane} />
        <AccountStat label="Countries" value={stats.countries} icon={Globe} />
        <AccountStat label="Nights away" value={stats.nights} icon={Moon} />
        <AccountStat label="Total spent" value={money(stats.totalSpentUsd)} icon={Wallet} />
      </div>

      {stats.cities.length > 0 && (
        <div className="mb-8 rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            Places you&apos;ve been
          </p>
          <ul className="flex flex-wrap gap-2">
            {stats.cities.map((city) => (
              <li
                key={city}
                className="rounded-pill bg-surface-muted px-3 py-1 text-sm text-body"
              >
                {city}
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 ? (
        <div className="grid gap-3">
          {history.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <AccountEmpty
          icon={Plane}
          title="No trips yet"
          description="Your completed trips will appear here once you've traveled with us."
          action={
            <Link href="/" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Plan a trip
            </Link>
          }
        />
      )}
    </div>
  );
}
