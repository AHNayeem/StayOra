"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb, Sparkles } from "lucide-react";
import type { Listing } from "@/types/catalog";
import {
  Alert,
  Badge,
  Button,
  CHART_COLORS,
  ChartCard,
  EmptyState,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Switch,
  Tabs,
  TrendChart,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercent } from "../../lib/format";
import { merchantForListing, toPropertyRef, useDomainValue } from "@/features/booking";
import { getRoomTypes, type RoomType } from "../../domain/inventory";
import {
  DEMAND_LABELS,
  DEMAND_TONES,
  RECOMMENDATION_LABELS,
  RULE_KIND_LABELS,
  forecastRevenue,
  propertyMetrics,
  propertyRecommendations,
  roomMetrics,
  summarizeMetrics,
  windowLength,
  type DayMetrics,
  type Recommendation,
} from "../../domain/revenue-management";
import { useDomainScope } from "../../domain/use-domain";
import {
  useApplyRecommendation,
  useBookingPace,
  useBookingPerformance,
  useRecommendationRules,
  useUpdateRecommendationRule,
} from "./hooks";

/** Default window: the next 30 nights from the demo clock. */
function isoIn(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Revenue management — pricing, pace and the recommendations that connect them.
 *
 * This is not the rate calendar (that is Catalog → Rates & availability); it is
 * the layer above it. Occupancy, ADR, RevPAR, pace and the forecast are all
 * derived from the same inventory baseline and booking ledger the calendar
 * edits, and applying a recommendation writes an ordinary inventory override —
 * so the next quote a customer sees already reflects it.
 */
export function RevenueManager({ listings }: { listings: Listing[] }) {
  const scope = useDomainScope();
  const apply = useApplyRecommendation();
  const updateRule = useUpdateRecommendationRule();

  const visible = useMemo(
    () =>
      scope.merchantId
        ? listings.filter((l) => merchantForListing(l).id === scope.merchantId)
        : listings,
    [listings, scope.merchantId],
  );

  const [listingId, setListingId] = useState(visible[0]?.id ?? "");
  const listing = visible.find((l) => l.id === listingId) ?? visible[0];
  const [from, setFrom] = useState(isoIn(0));
  const [to, setTo] = useState(isoIn(29));
  const [roomFilter, setRoomFilter] = useState("all");
  const [tab, setTab] = useState("recommendations");

  const property = listing ? toPropertyRef(listing) : null;
  const nights = windowLength(from, to);

  const rooms = useDomainValue<RoomType[]>(
    () => (property ? getRoomTypes(property) : []),
    [property?.id],
  );

  const metrics = useDomainValue<DayMetrics[]>(
    () => {
      if (!property) return [];
      if (roomFilter === "all") return propertyMetrics(property, from, nights);
      const room = getRoomTypes(property).find((r) => r.id === roomFilter);
      return room ? roomMetrics(property, room, from, nights) : [];
    },
    [property?.id, from, nights, roomFilter],
  );

  const recommendations = useDomainValue<Recommendation[]>(
    () => (property ? propertyRecommendations(property, from, nights) : []),
    [property?.id, from, nights],
  );

  const rules = useRecommendationRules(property?.id);
  const pace = useBookingPace(listing?.id);
  const performance = useBookingPerformance(listing?.id);

  const summary = useMemo(() => summarizeMetrics(metrics), [metrics]);
  const forecast = useMemo(() => forecastRevenue(metrics), [metrics]);

  if (!listing || !property) {
    return (
      <EmptyState
        title="No properties in your scope"
        description="You don't manage any listings with bookable inventory yet."
      />
    );
  }

  const chartRows = metrics.map((day) => ({
    date: day.date.slice(5),
    occupancy: Math.round(day.occupancy * 100),
    adr: day.adr,
    revpar: day.revpar,
  }));

  const paceRows = (pace.data ?? []).slice(-12).map((p) => ({
    period: p.period.slice(2),
    bookings: p.bookings,
    revenue: p.revenue,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* ---- selector ----------------------------------------------------- */}
      <Panel flush>
        <PanelHeader
          title="Window"
          description="Every metric, chart and recommendation below reacts to this selection."
        />
        <PanelBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Property"
              value={listing.id}
              onChange={(e) => setListingId(e.target.value)}
              options={visible.map((l) => ({ value: l.id, label: l.title }))}
            />
            <Select
              label="Room type"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              options={[
                { value: "all", label: "All room types" },
                ...rooms.map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </PanelBody>
      </Panel>

      {/* ---- the hotel-industry KPIs -------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Occupancy"
          icon="BedDouble"
          value={formatPercent(summary.occupancy)}
          hint={`${formatNumber(summary.roomsSold)} of ${formatNumber(summary.roomsAvailable)} room nights`}
        />
        <StatCard
          label="ADR"
          icon="Coins"
          value={formatCurrency(summary.adr, summary.currency)}
          hint="Average daily rate — revenue ÷ rooms sold"
        />
        <StatCard
          label="RevPAR"
          icon="ChartNoAxesCombined"
          value={formatCurrency(summary.revpar, summary.currency)}
          hint="Revenue per available room"
        />
        <StatCard
          label="Room revenue"
          icon="Wallet"
          value={formatCurrency(summary.revenue, summary.currency)}
          hint={`${summary.nights} nights in window`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue forecast"
          icon="TrendingUp"
          value={formatCurrency(forecast.forecast, summary.currency)}
          hint={`${formatCurrency(forecast.onTheBooks, summary.currency)} on the books`}
        />
        <StatCard
          label="Forecast occupancy"
          icon="Gauge"
          value={formatPercent(forecast.forecastOccupancy)}
          hint={`${Math.round(forecast.pickupRate * 100)}% assumed pickup`}
        />
        <StatCard
          label="Cancellation rate"
          icon="ArrowLeftRight"
          value={
            performance.data ? formatPercent(performance.data.cancellationRate) : "—"
          }
          hint={
            performance.data
              ? `${formatNumber(performance.data.cancellations)} of ${formatNumber(performance.data.bookings)} bookings`
              : undefined
          }
        />
        <StatCard
          label="Average length of stay"
          icon="Clock"
          value={
            performance.data ? `${performance.data.averageLengthOfStay.toFixed(1)} nights` : "—"
          }
          hint={
            performance.data
              ? `${performance.data.averageLeadTime} days average lead time`
              : undefined
          }
        />
      </div>

      <Alert tone="info" title="How the forecast is built">
        {forecast.explanation} It is a planning aid derived from the current window, not a
        prediction — there is no model behind it.
      </Alert>

      {/* ---- charts -------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Occupancy & rate"
          description="Per night across the selected window"
          empty={chartRows.length === 0}
          height={280}
        >
          <TrendChart
            data={chartRows}
            xKey="date"
            dualAxis
            height={280}
            series={[
              {
                key: "occupancy",
                label: "Occupancy",
                color: CHART_COLORS.primary,
                type: "area",
                format: (v) => `${v}%`,
              },
              {
                key: "adr",
                label: "ADR",
                color: CHART_COLORS.accent,
                type: "line",
                axis: "right",
                format: (v) => formatCurrency(v, summary.currency),
              },
            ]}
            leftTickFormatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard
          title="Booking pace"
          description="Bookings and net sales by the month they were made"
          empty={paceRows.length === 0}
          height={280}
        >
          <TrendChart
            data={paceRows}
            xKey="period"
            dualAxis
            height={280}
            series={[
              {
                key: "revenue",
                label: "Net sales",
                color: CHART_COLORS.primary,
                type: "bar",
                format: (v) => formatCurrency(v, summary.currency),
              },
              {
                key: "bookings",
                label: "Bookings",
                color: CHART_COLORS.accent,
                type: "line",
                axis: "right",
              },
            ]}
          />
        </ChartCard>
      </div>

      {/* ---- recommendations & rules -------------------------------------- */}
      <Panel flush>
        <PanelHeader
          title="Revenue management"
          description="Deterministic recommendations and the rules that produce them."
          actions={
            <Tabs
              items={[
                { key: "recommendations", label: `Recommendations (${recommendations.length})` },
                { key: "rules", label: "Rules" },
                { key: "calendar", label: "Demand calendar" },
              ]}
              value={tab}
              onValueChange={setTab}
              variant="pill"
              renderPanels={false}
            />
          }
        />
        <PanelBody>
          {tab === "recommendations" && (
            <div className="flex flex-col gap-3">
              {recommendations.length === 0 ? (
                <EmptyState
                  title="Nothing to change"
                  description="No night in this window is far enough from its target to warrant a price move."
                />
              ) : (
                recommendations.slice(0, 20).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-wrap items-start gap-4 rounded-card border border-line p-4"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-field",
                        rec.kind === "raise_price"
                          ? "bg-primary-50 text-primary-700"
                          : "bg-surface-muted text-body",
                      )}
                    >
                      {rec.kind === "raise_price" ? (
                        <Sparkles className="size-4" />
                      ) : (
                        <Lightbulb className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge size="sm" variant="neutral">
                          {RECOMMENDATION_LABELS[rec.kind]}
                        </Badge>
                        <span className="text-xs text-muted">
                          {rec.roomTypeName} · {rec.date}
                        </span>
                        <Badge
                          size="sm"
                          variant={rec.confidence === "high" ? "success" : "neutral"}
                        >
                          {rec.confidence} confidence
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-sm text-ink">{rec.message}</p>
                      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                        {rec.evidence.map((item) => (
                          <div key={item.label} className="flex gap-1.5 text-xs">
                            <dt className="text-muted">{item.label}:</dt>
                            <dd className="font-medium tabular-nums text-body">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {rec.impact !== 0 && (
                        <span className="text-sm font-semibold tabular-nums text-ink">
                          {rec.impact > 0 ? "+" : ""}
                          {formatCurrency(rec.impact, summary.currency)}
                        </span>
                      )}
                      <Can anyPermission={["catalog:update"]}>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Check className="size-4" />}
                          onClick={async () => {
                            await apply.mutateAsync(rec);
                            toast.success(`Applied — ${rec.roomTypeName}, ${rec.date}`);
                          }}
                        >
                          Apply
                        </Button>
                      </Can>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "rules" && (
            <div className="flex flex-col gap-3">
              {(rules.data ?? []).map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{rule.name}</p>
                      <Badge size="sm" variant="neutral">
                        {RULE_KIND_LABELS[rule.kind]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{rule.note}</p>
                    <p className="mt-1 text-xs tabular-nums text-body">
                      {rule.threshold > 0 &&
                        `Occupancy threshold ${Math.round(rule.threshold * 100)}% · `}
                      {rule.unitsRemaining > 0 && `${rule.unitsRemaining} units left · `}
                      {rule.adjustmentPercent !== 0 &&
                        `${rule.adjustmentPercent > 0 ? "+" : ""}${rule.adjustmentPercent}% price · `}
                      {rule.kind === "min_stay" && `${rule.minStay} night minimum · `}
                      priority {rule.priority}
                    </p>
                  </div>
                  <Can anyPermission={["catalog:update"]}>
                    <Switch
                      label={rule.status === "active" ? "Active" : "Paused"}
                      checked={rule.status === "active"}
                      onChange={async (e) => {
                        await updateRule.mutateAsync({
                          id: rule.id,
                          input: { status: e.target.checked ? "active" : "paused" },
                        });
                        toast.success(
                          `${rule.name} ${e.target.checked ? "activated" : "paused"}`,
                        );
                      }}
                    />
                  </Can>
                </div>
              ))}
            </div>
          )}

          {tab === "calendar" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {metrics.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "rounded-field border border-line p-2.5",
                    day.stopSell && "opacity-60",
                  )}
                >
                  <p className="text-xs font-medium text-ink">{day.date.slice(5)}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-ink">
                    {formatCurrency(day.price, summary.currency)}
                  </p>
                  <p className="text-xs tabular-nums text-muted">
                    {formatPercent(day.occupancy)} · {day.available} left
                  </p>
                  <StatusBadge tone={DEMAND_TONES[day.demand]} className="mt-1.5">
                    {DEMAND_LABELS[day.demand]}
                  </StatusBadge>
                  {day.stopSell && (
                    <p className="mt-1 text-xs font-medium text-danger">Closed</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
