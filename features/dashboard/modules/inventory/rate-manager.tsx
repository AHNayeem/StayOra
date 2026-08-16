"use client";

import { useMemo, useState } from "react";
import {
  CalendarCog,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lock,
  RotateCcw,
  Save,
  TriangleAlert,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import {
  allRatePlans,
  bulkUpdateInventory,
  calendar,
  clearOverrides,
  dateRange,
  getRoomTypes,
  isPerNight,
  ratePlansFor,
  unitNoun,
  type DayRate,
  type RoomType,
} from "../../domain";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { merchantForListing, toPropertyRef, useDomainValue } from "@/features/booking";
import { Can } from "../../rbac/permission-guard";
import {
  Button,
  EmptyState,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Switch,
} from "../../ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** First of the month, `offset` months from the current one, as `YYYY-MM-DD`. */
function monthStart(offset: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  return date.toISOString().slice(0, 10);
}

function daysInMonth(iso: string): number {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Revenue management — the availability and rate calendar.
 *
 * Cells show the *resolved* position: the generated baseline, plus whatever a
 * revenue manager has overridden, minus what bookings and live holds have
 * consumed. Edits are written as overrides on the same date/room key the
 * booking engine reads, so a price change here is the price the next customer
 * is quoted, and closing out a date genuinely blocks the checkout.
 */
export function RateManager({ listings }: { listings: Listing[] }) {
  const scope = useDomainScope();
  const actor = useDomainActor();

  // Merchants only manage their own properties — the same row-level rule the
  // rest of the domain applies, resolved here through the catalogue join.
  const visible = useMemo(
    () =>
      scope.merchantId
        ? listings.filter((listing) => merchantForListing(listing).id === scope.merchantId)
        : listings,
    [listings, scope.merchantId],
  );

  const [listingId, setListingId] = useState(visible[0]?.id ?? "");
  const listing = visible.find((l) => l.id === listingId) ?? visible[0];

  const property = listing ? toPropertyRef(listing) : null;
  const rooms = useDomainValue<RoomType[]>(
    () => (property ? getRoomTypes(property) : []),
    [property?.id],
  );
  const [roomIndex, setRoomIndex] = useState(0);
  const room = rooms[Math.min(roomIndex, Math.max(0, rooms.length - 1))];

  const [monthOffset, setMonthOffset] = useState(0);
  const start = monthStart(monthOffset);
  const days = daysInMonth(start);

  const grid = useDomainValue<DayRate[]>(
    () => (property && room ? calendar(property, room, start, days) : []),
    [property?.id, room?.id, start, days],
  );

  const [selected, setSelected] = useState<string[]>([]);

  if (!listing || !property) {
    return (
      <EmptyState
        title="No properties in your scope"
        description="You don't manage any listings with bookable inventory yet."
      />
    );
  }

  const noun = unitNoun(listing.vertical);
  const perNight = isPerNight(listing.vertical);
  const leadingBlanks = new Date(`${start}T00:00:00Z`).getUTCDay();

  const totals = grid.reduce(
    (acc, day) => ({
      allotment: acc.allotment + day.allotment,
      booked: acc.booked + day.booked,
      closed: acc.closed + (day.stopSell ? 1 : 0),
      revenue: acc.revenue + day.booked * day.price,
    }),
    { allotment: 0, booked: 0, closed: 0, revenue: 0 },
  );
  const occupancy = totals.allotment ? Math.round((totals.booked / totals.allotment) * 100) : 0;

  const toggleDay = (date: string) =>
    setSelected((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Units on sale" value={String(totals.allotment)} icon="LayoutGrid" />
        <StatCard label="Sold or held" value={String(totals.booked)} icon="BedDouble" />
        <StatCard label="Occupancy" value={`${occupancy}%`} icon="ChartNoAxesColumn" />
        <StatCard label="Closed dates" value={String(totals.closed)} icon="CalendarX" />
      </div>

      <Panel>
        <PanelHeader
          title="Rate & availability calendar"
          description={`${listing.title} · ${monthLabel(start)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Property"
                value={listing.id}
                onChange={(event) => {
                  setListingId(event.target.value);
                  setRoomIndex(0);
                  setSelected([]);
                }}
                options={visible.map((item) => ({ value: item.id, label: item.title }))}
                wrapperClassName="w-64"
              />
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous month"
                  onClick={() => {
                    setMonthOffset((n) => n - 1);
                    setSelected([]);
                  }}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next month"
                  onClick={() => {
                    setMonthOffset((n) => n + 1);
                    setSelected([]);
                  }}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          }
        />
        <PanelBody className="space-y-4">
          {/* A filter group, not a tablist: these buttons re-scope the one
              calendar below rather than swapping between sibling panels, and
              claiming `tab` would promise arrow-key navigation that isn't
              there. */}
          {rooms.length > 1 && (
            <div role="group" aria-label="Room type" className="flex flex-wrap gap-2">
              {rooms.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={index === roomIndex}
                  onClick={() => {
                    setRoomIndex(index);
                    setSelected([]);
                  }}
                  className={cn(
                    "rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    index === roomIndex
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-surface text-body hover:border-primary hover:text-primary",
                  )}
                >
                  {option.name}
                  <span className="ml-1.5 text-xs opacity-70">{option.totalUnits} units</span>
                </button>
              ))}
            </div>
          )}

          <div
            role="group"
            aria-label={`Availability calendar — ${monthLabel(start)}`}
            className="overflow-x-auto"
          >
            <div className="min-w-3xl">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-1">
                    {day}
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
                    noun={noun}
                    selected={selected.includes(day.date)}
                    onToggle={() => toggleDay(day.date)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Multi-select over a 30-cell grid is invisible without this: each
              toggle otherwise only announces its own pressed state. */}
          <p aria-live="polite" className="text-sm text-muted">
            {selected.length === 0
              ? "No dates selected."
              : `${selected.length} ${selected.length === 1 ? "date" : "dates"} selected.`}
          </p>

          <ul className="flex flex-wrap gap-4 border-t border-line pt-3 text-xs text-muted">
            <Legend className="bg-surface" label="On sale" />
            <Legend className="bg-warning/25" label="Low availability" />
            <Legend className="bg-danger/15" label="Sold out" />
            <Legend className="bg-ink/10" label="Stop sell" />
            <Legend className="bg-primary-50 ring-1 ring-primary" label="Selected" />
          </ul>
        </PanelBody>
      </Panel>

      {room && (
        <Can anyPermission={["catalog:update"]}>
          <BulkEditor
            propertyId={property.id}
            room={room}
            perNight={perNight}
            selectedDates={selected}
            monthStartIso={start}
            monthDays={days}
            actorName={actor.name}
            onDone={() => setSelected([])}
          />
        </Can>
      )}

      <Panel>
        <PanelHeader
          title="Rate plans"
          description="Multipliers applied to the nightly price above. Manage them under Pricing → Rate plans."
        />
        <PanelBody className="p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">Rate plans and their multipliers</caption>
            <thead className="border-b border-line bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Multiplier</th>
                <th scope="col" className="px-4 py-3 font-semibold">Policy</th>
                <th scope="col" className="px-4 py-3 font-semibold">Stay rules</th>
                <th scope="col" className="px-4 py-3 font-semibold">Sold here</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {allRatePlans().map((plan) => {
                const offered = ratePlansFor(listing.vertical, property.id).some(
                  (p) => p.id === plan.id,
                );
                return (
                  <tr key={plan.id} className={cn(!offered && "opacity-50")}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{plan.name}</p>
                      <p className="text-xs text-muted">{plan.description}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink">
                      ×{plan.priceFactor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={plan.refundable ? "success" : "warning"}>
                        {plan.cancellationPolicyId.replace(/_/g, " ")}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-body">
                      Min {plan.minStay} · Max {plan.maxStay} nights
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={offered ? "success" : "neutral"}>
                        {offered ? "Yes" : "Not offered"}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </PanelBody>
      </Panel>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm border border-line", className)} aria-hidden="true" />
      {label}
    </li>
  );
}

function DayCell({
  day,
  noun,
  selected,
  onToggle,
}: {
  day: DayRate;
  noun: { one: string; many: string };
  selected: boolean;
  onToggle: () => void;
}) {
  const soldOut = !day.stopSell && day.available === 0;
  const low = !day.stopSell && day.available > 0 && day.available <= 2;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${day.date}: ${day.available} ${noun.many} available at $${day.price}${
        day.blocked > 0 ? `, ${day.blocked} held by ${day.blockedBy ?? "another channel"}` : ""
      }`}
      title={day.blockedBy ? `${day.blocked} held — ${day.blockedBy}` : undefined}
      className={cn(
        "flex min-h-20 flex-col gap-0.5 rounded-field border p-2 text-left text-xs transition-colors",
        selected ? "border-primary bg-primary-50 ring-1 ring-primary" : "border-line",
        !selected && day.stopSell && "bg-ink/10",
        !selected && soldOut && "bg-danger/15",
        !selected && low && "bg-warning/25",
        !selected && !day.stopSell && !soldOut && !low && "bg-surface hover:border-primary/40",
      )}
    >
      <span className="font-semibold text-ink">{Number(day.date.slice(8))}</span>
      <span className="font-bold tabular-nums text-ink">${day.price.toFixed(0)}</span>
      {day.stopSell ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted">
          <Lock className="size-3" aria-hidden="true" />
          Closed
        </span>
      ) : (
        <span className="text-[11px] text-muted">
          {day.available}/{day.allotment} free
        </span>
      )}
      <span className="flex flex-wrap gap-1 text-[10px] text-muted">
        {day.minStay > 1 && <span className="rounded bg-surface-muted px-1">MIN {day.minStay}</span>}
        {day.closedToArrival && <span className="rounded bg-surface-muted px-1">CTA</span>}
        {day.closedToDeparture && <span className="rounded bg-surface-muted px-1">CTD</span>}
        {/* Nights another channel has taken — the merchant can't sell them here
            and needs to know that isn't a mistake in our numbers. */}
        {day.blocked > 0 && (
          <span className="rounded bg-warning/30 px-1 font-semibold">
            OTA {day.blocked}
          </span>
        )}
      </span>
    </button>
  );
}

/** Bulk price/availability editing across a date range or the selected cells. */
function BulkEditor({
  propertyId,
  room,
  perNight,
  selectedDates,
  monthStartIso,
  monthDays,
  actorName,
  onDone,
}: {
  propertyId: string;
  room: RoomType;
  perNight: boolean;
  selectedDates: string[];
  monthStartIso: string;
  monthDays: number;
  actorName: string;
  onDone: () => void;
}) {
  const monthEnd = dateRange(monthStartIso, monthDays).at(-1)!;
  const [from, setFrom] = useState(monthStartIso);
  const [to, setTo] = useState(monthEnd);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [price, setPrice] = useState("");
  const [allotment, setAllotment] = useState("");
  const [minStay, setMinStay] = useState("");
  const [stopSell, setStopSell] = useState(false);
  const [applyStopSell, setApplyStopSell] = useState(false);
  const [cta, setCta] = useState(false);
  const [ctd, setCtd] = useState(false);
  const [applyCta, setApplyCta] = useState(false);
  const [applyCtd, setApplyCtd] = useState(false);

  const usingSelection = selectedDates.length > 0;
  const rangeLabel = usingSelection
    ? `${selectedDates.length} selected date${selectedDates.length === 1 ? "" : "s"}`
    : `${from} → ${to}`;

  const apply = () => {
    const targets = usingSelection
      ? [...selectedDates].sort()
      : null;

    const patch = {
      propertyId,
      roomTypeId: room.id,
      updatedBy: actorName,
      price: price ? Number(price) : undefined,
      allotment: allotment ? Number(allotment) : undefined,
      minStay: minStay ? Number(minStay) : undefined,
      stopSell: applyStopSell ? stopSell : undefined,
      closedToArrival: applyCta ? cta : undefined,
      closedToDeparture: applyCtd ? ctd : undefined,
    };

    const nothingToDo =
      patch.price === undefined &&
      patch.allotment === undefined &&
      patch.minStay === undefined &&
      patch.stopSell === undefined &&
      patch.closedToArrival === undefined &&
      patch.closedToDeparture === undefined;

    if (nothingToDo) {
      toast.error("Nothing to apply", { description: "Set at least one value first." });
      return;
    }

    let touched = 0;
    if (targets) {
      // Selected cells: one single-day update each, so gaps stay untouched.
      for (const date of targets) {
        touched += bulkUpdateInventory({ ...patch, from: date, to: date });
      }
    } else {
      touched = bulkUpdateInventory({ ...patch, from, to, weekdays });
    }

    toast.success(`Updated ${touched} date${touched === 1 ? "" : "s"}`, {
      description: `${room.name} · ${rangeLabel}`,
    });
    onDone();
  };

  const reset = () => {
    const removed = usingSelection
      ? selectedDates.reduce(
          (sum, date) => sum + clearOverrides(room.id, date, date),
          0,
        )
      : clearOverrides(room.id, from, to);
    toast.success(`Reset ${removed} override${removed === 1 ? "" : "s"}`, {
      description: "Those dates are back on the generated baseline.",
    });
    onDone();
  };

  return (
    <Panel>
      <PanelHeader
        title="Bulk update"
        description={
          usingSelection
            ? "Applying to the dates you selected in the calendar."
            : "Applying to a date range. Select cells in the calendar to target them instead."
        }
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3 py-1 text-xs font-medium text-body">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {rangeLabel}
          </span>
        }
      />
      <PanelBody className="space-y-4">
        {!usingSelection && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                label="From"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                type="date"
                label="To"
                value={to}
                min={from}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-ink">
                Only these days (leave empty for all)
              </legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={weekdays.includes(index)}
                    onClick={() =>
                      setWeekdays((prev) =>
                        prev.includes(index)
                          ? prev.filter((d) => d !== index)
                          : [...prev, index],
                      )
                    }
                    className={cn(
                      "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                      weekdays.includes(index)
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-surface text-body hover:border-primary",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="number"
            label="Nightly price (USD)"
            placeholder="Leave blank to keep"
            value={price}
            min={0}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Input
            type="number"
            label={`Units on sale (max ${room.totalUnits})`}
            placeholder="Leave blank to keep"
            value={allotment}
            min={0}
            max={room.totalUnits}
            onChange={(event) => setAllotment(event.target.value)}
          />
          {perNight && (
            <Input
              type="number"
              label="Minimum stay (nights)"
              placeholder="Leave blank to keep"
              value={minStay}
              min={1}
              onChange={(event) => setMinStay(event.target.value)}
            />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Toggle
            label="Stop sell"
            hint="Close these dates for sale entirely."
            enabled={applyStopSell}
            onEnabledChange={setApplyStopSell}
            value={stopSell}
            onValueChange={setStopSell}
          />
          {perNight && (
            <>
              <Toggle
                label="Closed to arrival"
                hint="Stays may not start on these dates."
                enabled={applyCta}
                onEnabledChange={setApplyCta}
                value={cta}
                onValueChange={setCta}
              />
              <Toggle
                label="Closed to departure"
                hint="Stays may not end on these dates."
                enabled={applyCtd}
                onEnabledChange={setApplyCtd}
                value={ctd}
                onValueChange={setCtd}
              />
            </>
          )}
        </div>

        <p className="flex items-start gap-2 rounded-field bg-surface-muted/60 p-3 text-xs text-muted">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Reducing units below what&rsquo;s already sold won&rsquo;t cancel those bookings — the
          date simply shows as oversold until they&rsquo;re moved.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" leftIcon={<Save className="size-4" />} onClick={apply}>
            Apply changes
          </Button>
          <Button variant="outline" leftIcon={<RotateCcw className="size-4" />} onClick={reset}>
            Reset to baseline
          </Button>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
            <CalendarCog className="size-3.5" aria-hidden="true" />
            Changes take effect on the next customer quote immediately.
          </span>
        </div>
      </PanelBody>
    </Panel>
  );
}

function Toggle({
  label,
  hint,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-field border border-line p-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="mt-0.5 size-4 rounded border-line text-primary focus:ring-primary"
        />
        <span>
          <span className="font-medium text-ink">Change &ldquo;{label}&rdquo;</span>
          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
        </span>
      </label>
      {enabled && (
        <div className="mt-2 pl-6">
          <Switch
            checked={value}
            onChange={(event) => onValueChange(event.target.checked)}
            label={`${label} on`}
          />
        </div>
      )}
    </div>
  );
}
