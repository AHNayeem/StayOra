"use client";

import type { VerticalConfig } from "@/constants/verticals";
import type { BookingVertical } from "@/types/booking";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { cn } from "@/lib/utils";

interface SearchTabsProps {
  tabs: VerticalConfig[];
  active: BookingVertical;
  onSelect: (key: BookingVertical) => void;
}

/**
 * SearchTabs — the vertical selector above the hero search bar. Config-driven
 * from the vertical registry; horizontally scrollable on small screens.
 */
export function SearchTabs({ tabs, active, onSelect }: SearchTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Choose what to book"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-pill px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-white shadow-card"
                : "bg-surface/90 text-ink backdrop-blur hover:bg-surface",
            )}
          >
            <VerticalIcon name={tab.icon} className="size-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
