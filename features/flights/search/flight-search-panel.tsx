"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Plus, Search, Trash2 } from "lucide-react";
import type {
  CabinClass,
  FlightLeg,
  FlightSearchQuery,
  PassengerCounts,
  TripType,
} from "@/types/flight";
import { isQueryComplete, normalizeQuery } from "@/services/flight.service";
import { addDays } from "@/lib/flight-time";
import { toISODate } from "@/lib/date";
import { useHydrated } from "@/hooks/use-hydrated";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { searchHref } from "../query-url";
import { recordSearch } from "../saved-searches";
import { AirportField } from "./airport-field";
import { DateField } from "./date-field";
import { PassengerField, clampCounts } from "./passenger-field";

/** Trip types, in tab order, with the copy each one needs. */
const TRIP_TABS: Array<{ key: TripType; label: string }> = [
  { key: "one-way", label: "One way" },
  { key: "round-trip", label: "Round trip" },
  { key: "multi-city", label: "Multi-city" },
];

/** Multi-city is capped where airlines cap it. */
const MAX_LEGS = 6;

/** Optional search refinements, rendered as a checkbox row. */
const TRIP_OPTIONS = [
  { key: "directOnly", label: "Direct flights only", hint: "Non-stop itineraries" },
  { key: "flexibleDates", label: "Flexible dates", hint: "Widen the fare strip to ±7 days" },
  { key: "nearbyAirports", label: "Nearby airports", hint: "Include alternatives" },
  { key: "refundableOnly", label: "Refundable only", hint: "Fares you can cancel" },
  { key: "baggageIncluded", label: "Baggage included", hint: "Checked bag in the fare" },
] as const;

type OptionKey = (typeof TRIP_OPTIONS)[number]["key"];

interface FlightSearchPanelProps {
  /** Pre-fill from an existing search (results page, saved search, deal card). */
  initialQuery?: FlightSearchQuery;
  /**
   * `hero` — standalone card. `compact` — denser, for the results-page header.
   * `embedded` — no card chrome, for hosts that already provide a panel
   * (the home-page hero search).
   */
  variant?: "hero" | "compact" | "embedded";
  className?: string;
}

/**
 * FlightSearchPanel — the complete flight search form.
 *
 * Two things drive its structure:
 *
 *  1. **Trip type reshapes the form, not just a flag.** One-way hides the return
 *     date; round-trip pairs two dates; multi-city becomes a repeatable leg list.
 *     Switching between them *preserves* what the traveller already typed, so
 *     changing your mind never costs you the route you just entered.
 *  2. **Submitting navigates.** The search lives in the URL (see
 *     {@link searchHref}), so results are shareable and the back button works.
 *
 * Default dates are filled after hydration rather than during render: computing
 * "tomorrow" on the server and again on the client is a classic hydration
 * mismatch, and around midnight the two genuinely differ.
 */
export function FlightSearchPanel({
  initialQuery,
  variant = "hero",
  className,
}: FlightSearchPanelProps) {
  const router = useRouter();
  const hydrated = useHydrated();

  const [tripType, setTripType] = useState<TripType>(initialQuery?.tripType ?? "one-way");
  const [legs, setLegs] = useState<FlightLeg[]>(
    initialQuery?.legs.length
      ? initialQuery.legs
      : [{ from: "DAC", to: "", date: "" }],
  );
  const [passengers, setPassengers] = useState<PassengerCounts>(
    initialQuery?.passengers ?? { adults: 1, children: 0, infants: 0 },
  );
  const [cabin, setCabin] = useState<CabinClass>(initialQuery?.cabin ?? "economy");
  const [options, setOptions] = useState<Record<OptionKey, boolean>>({
    directOnly: initialQuery?.directOnly ?? false,
    flexibleDates: initialQuery?.flexibleDates ?? false,
    nearbyAirports: initialQuery?.nearbyAirports ?? false,
    refundableOnly: initialQuery?.refundableOnly ?? false,
    baggageIncluded: initialQuery?.baggageIncluded ?? false,
  });
  const [touched, setTouched] = useState(false);

  /**
   * Sensible default dates, *derived* rather than stored.
   *
   * "Tomorrow" can't go in initial state: `useState` runs on the server and
   * again on the client, and around midnight — or across timezones — the two
   * disagree, which is a hydration mismatch on the most visible field on the
   * page. Nor can it be written from an effect without a cascading render.
   *
   * So the state stays empty until the traveller actually picks a date, and the
   * *display* falls back to these values once hydrated. Submission reads the
   * same resolved values, so what you see is what gets searched.
   */
  const defaultDepart = hydrated ? addDays(toISODate(new Date()), 1) : "";
  const defaultReturn = defaultDepart ? addDays(defaultDepart, 7) : "";

  const resolvedLegs = legs.map((leg, i) => ({
    ...leg,
    date: leg.date || (i === 0 ? defaultDepart : i === 1 ? defaultReturn : ""),
  }));

  /* ---- Trip-type transitions ---------------------------------------------- */

  const onTripType = (next: TripType) => {
    setTripType(next);
    setLegs((current) => {
      const first = current[0] ?? { from: "", to: "", date: "" };
      if (next === "one-way") return [first];
      if (next === "round-trip") {
        const ret = current[1];
        return [
          first,
          {
            // The return leg mirrors the outbound unless one already exists.
            from: ret?.from || first.to,
            to: ret?.to || first.from,
            date: ret?.date || (first.date ? addDays(first.date, 7) : ""),
          },
        ];
      }
      // Multi-city: keep every leg we already have, seeding a second one that
      // continues from where the first landed.
      if (current.length >= 2) return current;
      return [
        first,
        {
          from: first.to,
          to: "",
          date: first.date ? addDays(first.date, 3) : "",
        },
      ];
    });
  };

  /* ---- Leg editing --------------------------------------------------------- */

  const setLeg = (index: number, patch: Partial<FlightLeg>) => {
    setLegs((current) =>
      current.map((leg, i) => {
        if (i !== index) return leg;
        const next = { ...leg, ...patch };
        // Bumping a leg's date past the next leg's would produce an itinerary
        // that departs before it arrives; push the later leg along instead.
        return next;
      }),
    );
  };

  const addLeg = () => {
    setLegs((current) => {
      if (current.length >= MAX_LEGS) return current;
      const last = current[current.length - 1];
      return [
        ...current,
        { from: last.to, to: "", date: last.date ? addDays(last.date, 3) : "" },
      ];
    });
  };

  const removeLeg = (index: number) => {
    setLegs((current) => (current.length <= 2 ? current : current.filter((_, i) => i !== index)));
  };

  /* ---- Round-trip mirroring ------------------------------------------------ */
  // On a round trip the return leg is the outbound reversed. Editing the
  // outbound updates it automatically so the traveller only fills it once.
  const setOutbound = (patch: Partial<FlightLeg>) => {
    setLegs((current) => {
      const next = [...current];
      next[0] = { ...next[0], ...patch };
      if (tripType === "round-trip" && next[1]) {
        next[1] = {
          ...next[1],
          from: next[0].to,
          to: next[0].from,
          // Keep the return on or after the outbound.
          date: next[1].date && next[1].date >= next[0].date ? next[1].date : "",
        };
      }
      return next;
    });
  };

  /* ---- Submission ---------------------------------------------------------- */

  // Built from the resolved legs so the search runs on the dates the traveller
  // can actually see in the fields.
  const query: FlightSearchQuery = normalizeQuery({
    tripType,
    legs: resolvedLegs,
    passengers,
    cabin,
    ...options,
    preferredAirlines: initialQuery?.preferredAirlines ?? [],
  });

  const complete = isQueryComplete(query);

  /** Per-leg validation messages, shown only after a failed submit. */
  const legErrors = resolvedLegs.map((leg) => {
    if (!touched) return {};
    return {
      from: !leg.from ? "Choose an origin" : undefined,
      to: !leg.to
        ? "Choose a destination"
        : leg.to === leg.from
          ? "Origin and destination must differ"
          : undefined,
      date: !leg.date ? "Choose a date" : undefined,
    };
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!complete) return;
    recordSearch(query, new Date().toISOString());
    router.push(searchHref(query));
  };

  const compact = variant === "compact";
  const embedded = variant === "embedded";
  const showReturn = tripType === "round-trip";
  const multiCity = tripType === "multi-city";

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        !embedded && "rounded-lg bg-surface shadow-card",
        !embedded && (compact ? "p-4" : "p-4 sm:p-6"),
        className,
      )}
    >
      {/* Trip type */}
      <div
        role="tablist"
        aria-label="Trip type"
        className="mb-5 flex gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {TRIP_TABS.map((tab) => {
          const active = tab.key === tripType;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTripType(tab.key)}
              className={cn(
                "shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-body hover:bg-surface-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Legs */}
      <div className="space-y-4">
        {multiCity ? (
          resolvedLegs.map((leg, index) => (
            <div key={index} className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AirportField
                  label={`Leg ${index + 1} · From`}
                  value={leg.from}
                  exclude={leg.to}
                  error={legErrors[index]?.from}
                  onChange={(code) => setLeg(index, { from: code })}
                />
                <AirportField
                  label="To"
                  icon="destination"
                  value={leg.to}
                  exclude={leg.from}
                  error={legErrors[index]?.to}
                  onChange={(code) => setLeg(index, { to: code })}
                />
                <DateField
                  label="Departure"
                  value={leg.date}
                  // Each leg must depart on or after the previous one.
                  min={index > 0 ? resolvedLegs[index - 1].date || undefined : undefined}
                  error={legErrors[index]?.date}
                  onChange={(iso) => setLeg(index, { date: iso })}
                />
              </div>
              {legs.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeLeg(index)}
                  aria-label={`Remove leg ${index + 1}`}
                  className="grid size-11 shrink-0 place-items-center self-start rounded-field text-muted transition-colors hover:bg-danger/10 hover:text-danger lg:mt-1"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
            <AirportField
              label="From"
              value={resolvedLegs[0]?.from ?? ""}
              exclude={resolvedLegs[0]?.to}
              error={legErrors[0]?.from}
              onChange={(code) => setOutbound({ from: code })}
            />

            <button
              type="button"
              onClick={() => {
                setLegs((current) => {
                  const next = [...current];
                  next[0] = { ...next[0], from: next[0].to, to: next[0].from };
                  if (showReturn && next[1]) {
                    next[1] = { ...next[1], from: next[0].to, to: next[0].from };
                  }
                  return next;
                });
              }}
              aria-label="Swap origin and destination"
              className="hidden size-11 shrink-0 place-items-center self-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-primary hover:text-primary lg:grid"
            >
              <ArrowLeftRight className="size-4" aria-hidden="true" />
            </button>

            <AirportField
              label="To"
              icon="destination"
              value={resolvedLegs[0]?.to ?? ""}
              exclude={resolvedLegs[0]?.from}
              error={legErrors[0]?.to}
              onChange={(code) => setOutbound({ to: code })}
            />

            <DateField
              label="Departure"
              value={resolvedLegs[0]?.date ?? ""}
              error={legErrors[0]?.date}
              onChange={(iso) => setOutbound({ date: iso })}
            />

            <DateField
              label="Return"
              value={showReturn ? (resolvedLegs[1]?.date ?? "") : ""}
              min={resolvedLegs[0]?.date || undefined}
              disabled={!showReturn}
              placeholder={showReturn ? "Add date" : "One way"}
              error={showReturn ? legErrors[1]?.date : undefined}
              onChange={(iso) => setLeg(1, { date: iso })}
            />
          </div>
        )}

        {multiCity && legs.length < MAX_LEGS && (
          <button
            type="button"
            onClick={addLeg}
            className="inline-flex items-center gap-1.5 rounded-pill border border-line px-4 py-2 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add another flight
          </button>
        )}

        {/* Travellers + cabin sit on their own row so the leg grid stays even */}
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-md">
          <PassengerField
            value={passengers}
            cabin={cabin}
            onChange={(next) => setPassengers(clampCounts(next))}
            onCabinChange={setCabin}
            className="sm:col-span-2"
          />
        </div>
      </div>

      {/* Trip options */}
      <fieldset className="mt-5 border-t border-line pt-4">
        <legend className="sr-only">Search options</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {TRIP_OPTIONS.map((option) => (
            <Checkbox
              key={option.key}
              label={option.label}
              hint={compact ? undefined : option.hint}
              checked={options[option.key]}
              onChange={(e) =>
                setOptions((current) => ({ ...current, [option.key]: e.target.checked }))
              }
            />
          ))}
        </div>
      </fieldset>

      <div className={cn("mt-6 flex", compact ? "justify-end" : "justify-center")}>
        <Button type="submit" size="lg" leftIcon={<Search className="size-4" aria-hidden="true" />}>
          Search flights
        </Button>
      </div>

      {touched && !complete && (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          Fill in every origin, destination and date to search.
        </p>
      )}
    </form>
  );
}
