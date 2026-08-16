"use client";

import { CalendarClock, Info, PartyPopper, Pin, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Listing } from "@/types/catalog";
import {
  PRICING_RULE_TYPE_LABELS,
  describeAdjustment,
  type PricingRule,
} from "../../domain";
import { formatCurrency, formatDate, formatPercent } from "../../lib/format";
import {
  Alert,
  Button,
  CHART_COLORS,
  ChartCard,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  TrendChart,
} from "../../ui";
import { cn } from "@/lib/utils";
import { PricingCalendar } from "./pricing-calendar";
import { usePricingConfig, usePricingOverview } from "./hooks";
import { usePricingScope } from "./use-pricing-scope";

/** How far ahead the overview looks. Ninety days is a rate manager's horizon. */
const WINDOW_DAYS = 90;

/**
 * The merchant's pricing home.
 *
 * Tiles first, because the questions a revenue manager arrives with are "what
 * am I charging on average", "how much of that is the rules rather than the
 * base rate" and "what's coming up". Then the calendar, which answers "why".
 */
export function PricingOverview({ listings }: { listings: Listing[] }) {
  const scope = usePricingScope(listings);
  const config = usePricingConfig(scope.property?.id);
  const currency = config.data?.currency ?? "USD";

  const overview = usePricingOverview(
    scope.property,
    scope.room?.id ?? "",
    scope.monthStartIso,
    WINDOW_DAYS,
  );

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No properties in your scope"
        description="You don't manage any listings with bookable inventory yet."
      />
    );
  }

  const data = overview.data ?? null;

  return (
    <div className="space-y-6">
      {config.data && !config.data.enabled && (
        <Alert
          tone="warning"
          title="Dynamic pricing is switched off"
          action={
            <Link href="/dashboard/settings/pricing">
              <Button size="sm" variant="outline">
                Open pricing settings
              </Button>
            </Link>
          }
        >
          Quotes use the base rate and any manual overrides only. Seasons, holidays,
          weekends and demand rules are all inert until it is turned back on.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading || !data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Average daily rate"
              value={formatCurrency(data.averageDailyRate, currency)}
              icon="Coins"
              hint={`Base ${formatCurrency(data.averageBaseRate, currency)} · ${
                data.upliftPercent >= 0 ? "+" : ""
              }${data.upliftPercent.toFixed(1)}% from rules`}
            />
            <StatCard
              label="Tonight"
              value={formatCurrency(data.currentRate, currency)}
              icon="BedDouble"
              hint={`${scope.room?.name ?? "Room"} · ${scope.plan?.name ?? "Standard"}`}
            />
            <StatCard
              label="Occupancy"
              value={formatPercent(data.occupancy)}
              icon="Gauge"
              hint={`Next ${WINDOW_DAYS} nights`}
            />
            <StatCard
              label="Revenue impact"
              value={formatCurrency(data.revenueImpact, currency)}
              icon="TrendingUp"
              hint="What the rules add over the base rate, across every unit offered"
            />
          </>
        )}
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Weekend uplift"
            value={`${data.weekendUpliftPercent >= 0 ? "+" : ""}${data.weekendUpliftPercent.toFixed(1)}%`}
            icon="CalendarCheck"
            hint="Weekend nights against their base rate"
          />
          <StatCard
            label="Seasonal uplift"
            value={`${data.seasonalUpliftPercent >= 0 ? "+" : ""}${data.seasonalUpliftPercent.toFixed(1)}%`}
            icon="Sunrise"
            hint="Nights a season or holiday owns"
          />
          <StatCard
            label="Active rules"
            value={String(data.activeRules)}
            icon="Sparkles"
            hint={data.pausedRules > 0 ? `${data.pausedRules} paused` : "None paused"}
          />
          <StatCard
            label="Manual overrides"
            value={String(data.overriddenNights)}
            icon="Layers"
            hint={`Nights pinned in the next ${WINDOW_DAYS}`}
          />
        </div>
      )}

      <ChartCard
        title="Base rate versus what you charge"
        description={`${scope.room?.name ?? "Room"} · next ${WINDOW_DAYS} nights. The gap is what the rule book is worth.`}
        loading={overview.isLoading}
        empty={!overview.isLoading && (data?.series.length ?? 0) === 0}
        emptyLabel="No nights to plot for this room."
        height={280}
      >
        <TrendChart
          data={data?.series ?? []}
          xKey="date"
          height={280}
          xTickFormatter={(value) => String(value).slice(5)}
          leftTickFormatter={(value) => formatCurrency(value, currency)}
          labelFormatter={(label) => formatDate(String(label))}
          series={[
            {
              key: "base",
              label: "Base rate",
              color: CHART_COLORS.info,
              type: "area",
              format: (value) => formatCurrency(value, currency),
            },
            {
              key: "effective",
              label: "What you charge",
              color: CHART_COLORS.accent600,
              type: "line",
              format: (value) => formatCurrency(value, currency),
            },
          ]}
        />
      </ChartCard>

      <PricingCalendar scope={scope} currency={currency} />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingPanel
          title="Upcoming seasons"
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
          rules={data?.upcomingSeasons ?? []}
          empty="No seasons start in the next four months."
        />
        <UpcomingPanel
          title="Upcoming holidays"
          icon={<PartyPopper className="size-4" aria-hidden="true" />}
          rules={data?.upcomingHolidays ?? []}
          empty="No holidays in the next four months."
        />
      </div>

      <Panel>
        <PanelHeader
          title="What's moving your rates"
          description={`The rules that actually fired in the next ${WINDOW_DAYS} nights, by what they're worth.`}
          actions={
            <Link href="/dashboard/catalog/pricing/rules">
              <Button variant="outline" size="sm">
                Manage rules
              </Button>
            </Link>
          }
        />
        <PanelBody>
          {!data || data.topRules.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Info className="size-4" aria-hidden="true" />
              No rule matched a night in this window — every night is at its base rate.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.topRules.map(({ rule, nights, impact }) => (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink">
                      {rule.name}
                      <StatusBadge tone="neutral">
                        {PRICING_RULE_TYPE_LABELS[rule.type]}
                      </StatusBadge>
                    </p>
                    <p className="text-xs text-muted">
                      {nights} {nights === 1 ? "night" : "nights"} ·{" "}
                      {describeAdjustment("", rule.adjustment, rule.calculationMode).trim()}{" "}
                      · priority {rule.priority}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      impact >= 0 ? "text-emerald-700" : "text-amber-700",
                    )}
                  >
                    {impact >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(impact), currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

function UpcomingPanel({
  title,
  icon,
  rules,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  rules: PricingRule[];
  empty: string;
}) {
  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        }
      />
      <PanelBody>
        {rules.length === 0 ? (
          <p className="text-sm text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rules.map((rule) => (
              <li key={rule.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{rule.name}</p>
                  <p className="text-xs text-muted">
                    {rule.condition.dateFrom ? formatDate(rule.condition.dateFrom) : "—"}
                    {rule.condition.dateTo ? ` → ${formatDate(rule.condition.dateTo)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {describeAdjustment("", rule.adjustment, rule.calculationMode).trim()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

/** Small badge used by other pricing screens to flag a pinned night. */
export function OverrideBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-900">
      <Pin className="size-3" aria-hidden="true" />
      Pinned
    </span>
  );
}

/** Re-exported so the overview page can show the engine's headline claim. */
export const PRICING_TAGLINE = (
  <span className="flex items-center gap-1.5 text-xs text-muted">
    <Sparkles className="size-3.5" aria-hidden="true" />
    One pricing path: what you see here is what the next customer is quoted.
  </span>
);
