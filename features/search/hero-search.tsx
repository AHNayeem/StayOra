"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  defaultGuests,
  HERO_SEARCH_TABS,
  POPULAR_DESTINATIONS,
  SEARCH_CONFIG,
} from "@/constants/search";
import { VERTICALS } from "@/constants/verticals";
import type { BookingVertical } from "@/types/booking";
import type { DateRangeValue, GuestCounts } from "@/types/search";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "./date-range-picker";
import { GuestSelector } from "./guest-selector";
import { LocationSelect } from "./location-select";
import { SearchTabs } from "./search-tabs";

interface HeroSearchProps {
  /** Which vertical tab is selected initially. Default "hotels". */
  defaultVertical?: BookingVertical;
  className?: string;
}

/**
 * HeroSearch — the tabbed, multi-vertical search widget layered over the hero.
 * The active vertical drives which fields render (location always; dates and
 * guests per the vertical config) and where a completed search navigates.
 */
export function HeroSearch({
  defaultVertical = "hotels",
  className,
}: HeroSearchProps) {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState<BookingVertical>(defaultVertical);
  const [location, setLocation] = useState("");
  const [dates, setDates] = useState<DateRangeValue>({ from: null, to: null });
  const [guests, setGuests] = useState<GuestCounts>(() =>
    defaultGuests(SEARCH_CONFIG[defaultVertical].guestUnits),
  );

  const vertical = VERTICALS[activeKey];
  const config = SEARCH_CONFIG[activeKey];

  const onSelectTab = (key: BookingVertical) => {
    setActiveKey(key);
    // Guest units differ per vertical — reseed to that vertical's defaults.
    setGuests(defaultGuests(SEARCH_CONFIG[key].guestUnits));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.set("location", location.trim());
    if (vertical.hasDateRange) {
      if (dates.from) params.set("from", dates.from);
      if (dates.to) params.set("to", dates.to);
    }
    if (vertical.hasGuests) {
      for (const [key, count] of Object.entries(guests)) {
        params.set(key, String(count));
      }
    }
    const query = params.toString();
    router.push(query ? `${vertical.href}?${query}` : vertical.href);
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <SearchTabs
          tabs={HERO_SEARCH_TABS}
          active={activeKey}
          onSelect={onSelectTab}
        />
      </div>

      <div className="rounded-panel bg-surface p-2 shadow-card">
        <form
          onSubmit={onSubmit}
          className="flex flex-col divide-y divide-line md:flex-row md:items-stretch md:divide-x md:divide-y-0"
        >
          <div className="md:flex-[1.3]">
            <LocationSelect
              label={config.locationLabel}
              placeholder={config.locationPlaceholder}
              value={location}
              onChange={setLocation}
              suggestions={POPULAR_DESTINATIONS}
            />
          </div>

          {vertical.hasDateRange && (
            <div className="flex md:flex-[2]">
              <DateRangePicker
                startLabel={config.startDateLabel}
                endLabel={config.endDateLabel}
                value={dates}
                onChange={setDates}
              />
            </div>
          )}

          {vertical.hasGuests && (
            <div className="md:flex-1">
              <GuestSelector
                label={config.guestsLabel}
                units={config.guestUnits}
                value={guests}
                onChange={setGuests}
              />
            </div>
          )}

          <div className="p-2 md:flex md:items-center">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 md:w-auto"
            >
              <Search className="size-4" aria-hidden="true" />
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
