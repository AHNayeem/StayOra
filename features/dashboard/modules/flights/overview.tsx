"use client";

import Link from "next/link";
import { useQuery } from "../../data";
import { StatCard } from "../../components/stat-card";
import {
  CategoryBarChart,
  ChartCard,
  CHART_COLORS,
  DonutChart,
  StatCardSkeleton,
  Button,
} from "../../ui";
import { formatCurrency, formatNumber } from "../../lib/format";
import { flightBookingKeys, flightBookingService } from "./service";
import { airlineKeys, airlineService } from "./service";
import { routeKeys, routeService } from "./service";
import { flightRefundKeys, flightRefundService } from "./service";

/**
 * FlightsOverview — the flight-operations landing screen.
 *
 * Aggregates across the module's services rather than adding a seventh
 * "analytics" service: every figure here is derived from rows an operator can
 * click through to, so a number on this page always has a table behind it.
 */
export function FlightsOverview() {
  // A large page size fetches the full set once so the aggregates are exact
  // rather than a first-page approximation.
  const bookings = useQuery({
    queryKey: [...flightBookingKeys.all, "overview"],
    queryFn: () => flightBookingService.list({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });
  const airlines = useQuery({
    queryKey: [...airlineKeys.all, "overview"],
    queryFn: () => airlineService.list({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });
  const routes = useQuery({
    queryKey: [...routeKeys.all, "overview"],
    queryFn: () => routeService.list({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });
  const refunds = useQuery({
    queryKey: [...flightRefundKeys.all, "overview"],
    queryFn: () => flightRefundService.list({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });

  const loading =
    bookings.isLoading || airlines.isLoading || routes.isLoading || refunds.isLoading;

  const bookingRows = bookings.data?.items ?? [];
  const refundRows = refunds.data?.items ?? [];

  const grossUsd = bookingRows
    .filter((b) => b.status !== "cancelled" && b.status !== "refunded")
    .reduce((sum, b) => sum + b.totalUsd, 0);
  const commissionUsd = bookingRows
    .filter((b) => b.status !== "cancelled" && b.status !== "refunded")
    .reduce((sum, b) => sum + b.commissionUsd, 0);
  const passengers = bookingRows.reduce((sum, b) => sum + b.passengers, 0);
  const pendingRefunds = refundRows.filter((r) => r.status === "requested").length;

  /** Revenue by carrier, top eight — where the volume actually sits. */
  const byCarrier = Object.entries(
    bookingRows.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.airlineCode] = (acc[booking.airlineCode] ?? 0) + booking.totalUsd;
      return acc;
    }, {}),
  )
    .map(([carrier, value]) => ({ carrier, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  /** Booking mix by cabin. */
  const byCabin = Object.entries(
    bookingRows.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.cabin] = (acc[booking.cabin] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value], i) => ({
    name,
    value,
    color: [
      CHART_COLORS.primary,
      CHART_COLORS.accent,
      CHART_COLORS.info,
      CHART_COLORS.violet,
    ][i % 4],
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Gross flight sales"
              value={formatCurrency(grossUsd, "USD")}
              icon="CircleDollarSign"
              hint={`${formatNumber(bookingRows.length)} bookings`}
            />
            <StatCard
              label="Commission earned"
              value={formatCurrency(commissionUsd, "USD")}
              icon="Percent"
              hint={
                grossUsd > 0
                  ? `${((commissionUsd / grossUsd) * 100).toFixed(1)}% blended rate`
                  : undefined
              }
            />
            <StatCard
              label="Passengers ticketed"
              value={formatNumber(passengers)}
              icon="Users"
              hint={`across ${formatNumber(routes.data?.total ?? 0)} routes`}
            />
            <StatCard
              label="Refunds awaiting review"
              value={formatNumber(pendingRefunds)}
              icon="RefreshCw"
              hint={`${formatNumber(refundRows.length)} total requests`}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue by carrier"
          description="Gross flight sales per airline, top eight."
          loading={loading}
          empty={!loading && byCarrier.length === 0}
          height={280}
          actions={
            <Link href="/dashboard/flights/airlines">
              <Button variant="ghost" size="sm">
                View airlines
              </Button>
            </Link>
          }
        >
          <CategoryBarChart
            data={byCarrier}
            xKey="carrier"
            valueKey="value"
            label="Revenue"
            height={280}
            valueFormatter={(v) => formatCurrency(v, "USD")}
          />
        </ChartCard>

        <ChartCard
          title="Bookings by cabin"
          description="Where demand sits across the cabin classes we sell."
          loading={loading}
          empty={!loading && byCabin.length === 0}
          height={280}
          actions={
            <Link href="/dashboard/flights/bookings">
              <Button variant="ghost" size="sm">
                View bookings
              </Button>
            </Link>
          }
        >
          <DonutChart data={byCabin} height={280} />
        </ChartCard>
      </div>

      <nav aria-label="Flight management" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/dashboard/flights/airlines", label: "Airlines", count: airlines.data?.total },
          { href: "/dashboard/flights/routes", label: "Routes", count: routes.data?.total },
          { href: "/dashboard/flights/schedules", label: "Schedules" },
          { href: "/dashboard/flights/passengers", label: "Passengers" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-card border border-line bg-surface p-4 transition-colors hover:border-primary"
          >
            <p className="text-sm font-semibold text-ink">{link.label}</p>
            {link.count !== undefined && (
              <p className="text-xs text-muted">{formatNumber(link.count)} records</p>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
