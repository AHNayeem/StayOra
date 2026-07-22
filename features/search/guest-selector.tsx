"use client";

import { Minus, Plus, Users } from "lucide-react";
import type { GuestUnit } from "@/constants/search";
import type { GuestCounts } from "@/types/search";
import { cn } from "@/lib/utils";
import { FieldPopover } from "./field-popover";

interface GuestSelectorProps {
  label: string;
  units: GuestUnit[];
  value: GuestCounts;
  onChange: (value: GuestCounts) => void;
}

/**
 * GuestSelector — a config-driven occupancy popover. The `units` (adults,
 * children, rooms, …) come from the active vertical's search config, so the
 * same component covers hotel rooms, tour travellers, and hall attendees.
 */
export function GuestSelector({
  label,
  units,
  value,
  onChange,
}: GuestSelectorProps) {
  const summary = units
    .filter((u) => (value[u.key] ?? u.min) > 0)
    .map((u) => `${value[u.key] ?? u.min} ${u.label.toLowerCase()}`)
    .join(" · ");

  const step = (unit: GuestUnit, delta: number) => {
    const current = value[unit.key] ?? unit.min;
    const next = Math.min(unit.max, Math.max(unit.min, current + delta));
    onChange({ ...value, [unit.key]: next });
  };

  return (
    <FieldPopover
      icon={<Users className="size-4" />}
      label={label}
      value={<span className="truncate">{summary || "Add guests"}</span>}
      isPlaceholder={!summary}
      align="right"
      panelClassName="w-72"
    >
      {() => (
        <ul className="space-y-1">
          {units.map((unit) => {
            const count = value[unit.key] ?? unit.min;
            return (
              <li
                key={unit.key}
                className="flex items-center justify-between gap-4 py-2"
              >
                <span>
                  <span className="block text-sm font-medium text-ink">
                    {unit.label}
                  </span>
                  {unit.hint && (
                    <span className="block text-xs text-muted">{unit.hint}</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <StepButton
                    ariaLabel={`Decrease ${unit.label}`}
                    onClick={() => step(unit, -1)}
                    disabled={count <= unit.min}
                    icon={<Minus className="size-4" aria-hidden="true" />}
                  />
                  <span className="w-6 text-center text-sm font-semibold text-ink">
                    {count}
                  </span>
                  <StepButton
                    ariaLabel={`Increase ${unit.label}`}
                    onClick={() => step(unit, 1)}
                    disabled={count >= unit.max}
                    icon={<Plus className="size-4" aria-hidden="true" />}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </FieldPopover>
  );
}

function StepButton({
  ariaLabel,
  onClick,
  disabled,
  icon,
}: {
  ariaLabel: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "grid size-8 place-items-center rounded-full border transition-colors",
        disabled
          ? "cursor-not-allowed border-line text-muted/40"
          : "border-line text-ink hover:border-primary hover:text-primary",
      )}
    >
      {icon}
    </button>
  );
}
