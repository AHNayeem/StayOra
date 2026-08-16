"use client";

import { useMemo, useState } from "react";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  Pin,
  PinOff,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useDomainValue } from "@/features/booking";
import {
  calculatedRate,
  calendar,
  DAILY_RATE_TAG_LABELS,
  PRICING_RULE_TYPE_LABELS,
  type DailyRateTag,
  type DayRate,
  type PropertyRef,
  type RatePlan,
  type RoomType,
} from "../../domain";
import { formatCurrency, formatPercent } from "../../lib/format";
import { Can } from "../../rbac/permission-guard";
import {
  Alert,
  Button,
  Drawer,
  EmptyState,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatusBadge,
  Textarea,
  Tooltip,
} from "../../ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useRemovePriceOverride, useSetPriceOverride } from "./hooks";
import { monthLabel, type PricingScope } from "./use-pricing-scope";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Cell styling per tag.
 *
 * Colour is never the only signal: every cell also carries a short text badge,
 * and the accessible name spells the state out in full. A merchant with a
 * colour-vision difference reads the same calendar.
 */
const TAG_STYLES: Record<DailyRateTag, { cell: string; badge: string; short: string }> = {
  normal: { cell: "bg-surface", badge: "bg-surface-muted text-body", short: "STD" },
  weekend: {
    cell: "bg-primary-50/70",
    badge: "bg-primary-100 text-primary-700",
    short: "WKD",
  },
  season: {
    cell: "bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-800",
    short: "SEA",
  },
  holiday: {
    cell: "bg-rose-500/10",
    badge: "bg-rose-500/20 text-rose-800",
    short: "HOL",
  },
  demand: {
    cell: "bg-violet-500/10",
    badge: "bg-violet-500/20 text-violet-800",
    short: "DMD",
  },
  discount: {
    cell: "bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-800",
    short: "SALE",
  },
  override: {
    cell: "bg-sky-500/12",
    badge: "bg-sky-500/25 text-sky-900",
    short: "PIN",
  },
};

/** The tag that decides a cell's background — the most specific one wins. */
const TAG_PRECEDENCE: DailyRateTag[] = [
  "override",
  "holiday",
  "season",
  "demand",
  "discount",
  "weekend",
  "normal",
];

function leadTag(tags: DailyRateTag[]): DailyRateTag {
  return TAG_PRECEDENCE.find((tag) => tags.includes(tag)) ?? "normal";
}

interface PricingCalendarProps {
  scope: PricingScope;
  currency: string;
  /** Renders the property/room/plan pickers in the panel header. */
  showPickers?: boolean;
}

/**
 * The pricing calendar.
 *
 * Each cell is the engine's answer for that night at the selected rate plan:
 * base rate, every rule that fired, and the effective rate. Clicking one opens
 * the full working — which is the point. A revenue manager who cannot see *why*
 * a Tuesday costs more than a Monday cannot trust the number, and will go back
 * to setting every night by hand.
 */
export function PricingCalendar({
  scope,
  currency,
  showPickers = true,
}: PricingCalendarProps) {
  const { property, room, plan, monthStartIso, monthDays } = scope;
  const [openDate, setOpenDate] = useState<string | null>(null);

  // Resolved for the *selected* rate plan, so a rule scoped to one plan shows
  // up on the calendar for that plan and nowhere else.
  const grid = useDomainValue<DayRate[]>(
    () =>
      property && room && plan
        ? calendar(property, room, monthStartIso, monthDays, plan.id)
        : [],
    [property?.id, room?.id, plan?.id, monthStartIso, monthDays],
  );

  const stats = useMemo(() => {
    if (grid.length === 0) return null;
    const base = grid.reduce((n, d) => n + d.baseRate, 0);
    const effective = grid.reduce((n, d) => n + d.price, 0);
    return {
      low: Math.min(...grid.map((d) => d.price)),
      high: Math.max(...grid.map((d) => d.price)),
      average: effective / grid.length,
      uplift: base > 0 ? (effective - base) / base : 0,
      overridden: grid.filter((d) => d.pricing.overridden).length,
    };
  }, [grid]);

  const selected = grid.find((d) => d.date === openDate) ?? null;

  if (!property || !room || !plan) {
    return (
      <EmptyState
        title="No properties in your scope"
        description="You don't manage any listings with bookable inventory yet."
      />
    );
  }

  const leadingBlanks = new Date(`${monthStartIso}T00:00:00Z`).getUTCDay();

  return (
    <>
      <Panel>
        <PanelHeader
          title="Pricing calendar"
          description={`${scope.listing?.title ?? "Property"} · ${room.name} · ${plan.name} · ${monthLabel(monthStartIso)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {showPickers && <ScopePickers scope={scope} />}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous month"
                  onClick={() => scope.setMonthOffset((n) => n - 1)}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next month"
                  onClick={() => scope.setMonthOffset((n) => n + 1)}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          }
        />
        <PanelBody className="space-y-4">
          {stats && (
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Figure label="Lowest night" value={formatCurrency(stats.low, currency)} />
              <Figure label="Average" value={formatCurrency(stats.average, currency)} />
              <Figure label="Highest night" value={formatCurrency(stats.high, currency)} />
              <Figure
                label="Uplift over base"
                value={formatPercent(stats.uplift)}
                tone={stats.uplift >= 0 ? "up" : "down"}
              />
            </dl>
          )}

          <div
            role="group"
            aria-label={`Pricing calendar — ${monthLabel(monthStartIso)}`}
            className="-mx-1 overflow-x-auto px-1 pb-1"
          >
            <div className="min-w-184">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1">
                    <abbr title={day} className="no-underline">
                      {day}
                    </abbr>
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }, (_, index) => (
                  <div key={`blank_${index}`} aria-hidden="true" />
                ))}
                {grid.map((day) => (
                  <DayCell
                    key={day.date}
                    day={day}
                    currency={currency}
                    active={openDate === day.date}
                    onOpen={() => setOpenDate(day.date)}
                  />
                ))}
              </div>
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-xs text-muted">
            {TAG_PRECEDENCE.map((tag) => (
              <li key={tag} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-4 place-items-center rounded-sm border border-line text-[8px] font-bold",
                    TAG_STYLES[tag].cell,
                  )}
                >
                  {TAG_STYLES[tag].short.slice(0, 1)}
                </span>
                {DAILY_RATE_TAG_LABELS[tag]}
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <DayDrawer
        day={selected}
        property={property}
        room={room}
        plan={plan}
        currency={currency}
        onClose={() => setOpenDate(null)}
      />
    </>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-field border border-line bg-surface-muted/40 px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1 text-base font-semibold text-ink tabular-nums">
        {tone === "up" && (
          <TrendingUp className="size-3.5 text-emerald-600" aria-hidden="true" />
        )}
        {tone === "down" && (
          <TrendingDown className="size-3.5 text-amber-600" aria-hidden="true" />
        )}
        {value}
      </dd>
    </div>
  );
}

function ScopePickers({ scope }: { scope: PricingScope }) {
  return (
    <>
      <Select
        aria-label="Property"
        value={scope.listing?.id ?? ""}
        onChange={(event) => scope.setListingId(event.target.value)}
        options={scope.listings.map((item) => ({ value: item.id, label: item.title }))}
        wrapperClassName="w-52"
      />
      <Select
        aria-label="Room type"
        value={scope.room?.id ?? ""}
        onChange={(event) => scope.setRoomId(event.target.value)}
        options={scope.rooms.map((item) => ({ value: item.id, label: item.name }))}
        wrapperClassName="w-44"
      />
      <Select
        aria-label="Rate plan"
        value={scope.plan?.id ?? ""}
        onChange={(event) => scope.setPlanId(event.target.value)}
        options={scope.plans.map((item) => ({ value: item.id, label: item.name }))}
        wrapperClassName="w-44"
      />
    </>
  );
}

function DayCell({
  day,
  currency,
  active,
  onOpen,
}: {
  day: DayRate;
  currency: string;
  active: boolean;
  onOpen: () => void;
}) {
  const tag = leadTag(day.pricing.tags);
  const style = TAG_STYLES[tag];
  const delta = day.price - day.baseRate;
  const reasons = day.pricing.applied
    .filter((entry) => entry.amount !== 0)
    .map((entry) => entry.label);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${day.date}. ${formatCurrency(day.price, currency)}. ${
        reasons.length > 0 ? reasons.join(". ") : "Base rate, no rules applied"
      }. ${day.available} of ${day.allotment} units available.${
        day.stopSell ? " Closed for sale." : ""
      }`}
      className={cn(
        "flex min-h-24 flex-col gap-1 rounded-field border p-2 text-left text-xs transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        style.cell,
        active ? "border-primary ring-2 ring-primary" : "border-line hover:border-primary/50",
        day.stopSell && "opacity-70",
      )}
    >
      <span className="flex items-center justify-between">
        <span className="font-semibold text-ink">{Number(day.date.slice(8))}</span>
        <span
          className={cn(
            "rounded px-1 text-[9px] font-bold uppercase tracking-wide",
            style.badge,
          )}
        >
          {style.short}
        </span>
      </span>

      <span className="font-bold tabular-nums text-ink">
        {formatCurrency(day.price, currency)}
      </span>

      {delta !== 0 && (
        <span
          className={cn(
            "tabular-nums text-[10px] font-medium",
            delta > 0 ? "text-amber-700" : "text-emerald-700",
          )}
        >
          {delta > 0 ? "+" : "−"}
          {formatCurrency(Math.abs(delta), currency)} vs base
        </span>
      )}

      <span className="mt-auto flex flex-wrap items-center gap-1 text-[10px] text-muted">
        {day.stopSell ? (
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <Lock className="size-2.5" aria-hidden="true" />
            Closed
          </span>
        ) : (
          <span>
            {day.available}/{day.allotment} free
          </span>
        )}
        {day.minStay > 1 && (
          <span className="rounded bg-surface-muted px-1">MIN {day.minStay}</span>
        )}
        {day.pricing.overridden && (
          <Pin className="size-2.5 text-sky-700" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}

/**
 * The full working for one night, plus the manual override editor.
 *
 * Applied rules are listed in the order the engine ran them, with the running
 * price before and after each — so the arithmetic on screen is literally the
 * arithmetic the booking engine did. Rules that matched but lost are listed too,
 * with the reason, because "why didn't my weekend rule apply" is the question a
 * merchant actually asks.
 */
function DayDrawer({
  day,
  property,
  room,
  plan,
  currency,
  onClose,
}: {
  day: DayRate | null;
  property: PropertyRef;
  room: RoomType;
  plan: RatePlan;
  currency: string;
  onClose: () => void;
}) {
  const setOverride = useSetPriceOverride();
  const removeOverride = useRemovePriceOverride();
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  // The form mirrors the open day until the merchant starts typing, so opening
  // a different cell never shows the previous one's numbers.
  const key = day?.date ?? "";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setPrice(day?.pricing.overridden ? String(day.price) : "");
    setReason(day?.pricing.overrideReason ?? "");
    setTouched(false);
  }

  if (!day) return null;

  const parsed = Number(price);
  const invalid = touched && (!price.trim() || !Number.isFinite(parsed) || parsed <= 0);
  const planFactor = plan.baseRate !== undefined ? 1 : plan.priceFactor;

  const submit = async () => {
    setTouched(true);
    if (!price.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    try {
      await setOverride.mutateAsync({
        propertyId: property.id,
        roomTypeId: room.id,
        from: day.date,
        to: day.date,
        price: parsed,
        reason: reason.trim() || undefined,
        calculatedPrice: calculatedRate(property, room, day.date),
        updatedBy: "",
        property,
      });
      toast.success("Rate pinned", {
        description: `${day.date} is now ${formatCurrency(parsed, currency)} until you lift it.`,
      });
      onClose();
    } catch (error) {
      toast.error("Couldn't pin that rate", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const lift = async () => {
    try {
      const cleared = await removeOverride.mutateAsync({
        roomTypeId: room.id,
        from: day.date,
        to: day.date,
      });
      toast.success(`Override lifted on ${cleared} night`, {
        description: "Pricing rules apply to that date again.",
      });
      onClose();
    } catch (error) {
      toast.error("Couldn't lift the override", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })}
      size="md"
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">
          {room.name} · {plan.name}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {day.pricing.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "rounded-pill px-2.5 py-0.5 text-xs font-semibold",
                TAG_STYLES[tag].badge,
              )}
            >
              {DAILY_RATE_TAG_LABELS[tag]}
            </span>
          ))}
        </div>

        {day.pricing.rulesDisabled && (
          <Alert tone="warning" title="Dynamic pricing is off for this property">
            Only the base rate and manual overrides apply. Turn it back on under
            Pricing settings.
          </Alert>
        )}

        {/* --- the working ------------------------------------------------ */}
        <section>
          <h3 className="text-sm font-semibold text-ink">How this rate was built</h3>
          <ol className="mt-2 space-y-2">
            <li className="flex items-baseline justify-between gap-3 rounded-field border border-line bg-surface-muted/40 px-3 py-2 text-sm">
              <span className="text-body">Base rate</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatCurrency(day.baseRate, currency)}
              </span>
            </li>
            {day.pricing.applied.map((entry, index) => (
              <li
                key={`${entry.ruleId}:${index}`}
                className="flex items-baseline justify-between gap-3 rounded-field border border-line px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block text-ink">{entry.label}</span>
                  <span className="block text-xs text-muted">
                    {entry.type === "manual_override"
                      ? "Set by hand — outranks every rule"
                      : `${entry.type === "rate_plan" ? "Rate plan" : PRICING_RULE_TYPE_LABELS[entry.type]} · priority ${entry.priority} · ${
                          entry.mode === "base_relative"
                            ? "measured against the base rate"
                            : entry.mode === "sequential"
                              ? "compounds on the running price"
                              : "overrides the rate"
                        }`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={cn(
                      "block font-semibold tabular-nums",
                      entry.amount >= 0 ? "text-amber-700" : "text-emerald-700",
                    )}
                  >
                    {entry.amount >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(entry.amount), currency)}
                  </span>
                  <span className="block text-xs text-muted tabular-nums">
                    → {formatCurrency(entry.to, currency)}
                  </span>
                </span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 rounded-field border border-primary bg-primary-50 px-3 py-2 text-sm">
              <span className="font-semibold text-ink">
                Effective rate{planFactor !== 1 ? " (standard plan)" : ""}
              </span>
              <span className="font-bold tabular-nums text-ink">
                {formatCurrency(day.price, currency)}
              </span>
            </li>
            {planFactor !== 1 && (
              <li className="flex items-baseline justify-between gap-3 rounded-field border border-line px-3 py-2 text-sm">
                <span className="text-body">
                  {plan.name} <span className="text-muted">×{planFactor}</span>
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatCurrency(day.price * planFactor, currency)}
                </span>
              </li>
            )}
          </ol>
        </section>

        {day.pricing.skipped.length > 0 && (
          <section>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              Rules that didn&rsquo;t apply
              <Tooltip content="A rule matched this date but was superseded. The reason is the conflict-resolution decision the engine made.">
                <Info className="size-3.5 text-muted" aria-hidden="true" />
              </Tooltip>
            </h3>
            <ul className="mt-2 space-y-1.5">
              {day.pricing.skipped.map((entry) => (
                <li
                  key={entry.ruleId}
                  className="rounded-field border border-dashed border-line px-3 py-2 text-sm"
                >
                  <span className="block text-body line-through decoration-muted">
                    {entry.name}
                  </span>
                  <span className="block text-xs text-muted">{entry.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 text-sm">
          <Figure
            label="Occupancy"
            value={formatPercent(day.pricing.occupancy)}
          />
          <Figure label="Units left" value={`${day.available} of ${day.allotment}`} />
        </section>

        {/* --- override --------------------------------------------------- */}
        <Can anyPermission={["catalog:update"]}>
          <section className="rounded-field border border-line p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Pin className="size-4 text-sky-700" aria-hidden="true" />
              Manual rate
            </h3>
            {day.pricing.overridden ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <StatusBadge tone="info">Override active</StatusBadge>
                  <span className="text-muted">
                    set by {day.pricing.overrideReason ? "" : "the property"}
                  </span>
                </p>
                {day.pricing.calculatedRate !== undefined && (
                  <p className="text-muted">
                    The rules would charge{" "}
                    <span className="font-medium text-ink tabular-nums">
                      {formatCurrency(day.pricing.calculatedRate, currency)}
                    </span>
                    ; this night is pinned at{" "}
                    <span className="font-medium text-ink tabular-nums">
                      {formatCurrency(day.price, currency)}
                    </span>
                    .
                  </p>
                )}
                {day.pricing.overrideReason && (
                  <p className="text-muted">Reason: {day.pricing.overrideReason}</p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">
                Pin a rate for this night. A manual rate outranks every pricing rule
                until you lift it.
              </p>
            )}

            <div className="mt-3 space-y-3">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                label={`Nightly rate (${currency})`}
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  setTouched(true);
                }}
                placeholder={String(day.pricing.calculatedRate ?? day.price)}
                error={invalid ? "Enter a rate above zero." : undefined}
              />
              <Textarea
                rows={2}
                label="Reason (optional)"
                hint="Shown to your team wherever this override appears."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Group booking agreed by phone"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={submit}
                  loading={setOverride.isPending}
                  leftIcon={<Pin className="size-4" />}
                >
                  {day.pricing.overridden ? "Update override" : "Pin this rate"}
                </Button>
                {day.pricing.overridden && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={lift}
                    loading={removeOverride.isPending}
                    leftIcon={<PinOff className="size-4" />}
                  >
                    Lift override
                  </Button>
                )}
              </div>
            </div>
          </section>
        </Can>

        {day.stopSell && (
          <p className="flex items-start gap-2 rounded-field bg-surface-muted/60 p-3 text-xs text-muted">
            <CalendarOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            This date is closed for sale in the availability calendar, so the rate above
            is not currently bookable.
          </p>
        )}

        <p className="flex items-start gap-2 text-xs text-muted">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Changes take effect on the very next customer quote — there is one pricing
          path, and this is it.
        </p>
      </div>
    </Drawer>
  );
}
