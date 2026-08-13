"use client";

import { Plus, Trash2, UserPlus } from "lucide-react";
import type { SavedTraveler } from "@/types/traveler";
import { controlClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Traveller details.
 *
 * Passport/nationality fields appear only where they are genuinely needed
 * (visa applications and international travel) rather than on every stay — the
 * fastest checkout is the one that asks least.
 */

export interface TravelerDraft {
  fullName: string;
  type: "adult" | "child" | "infant";
  email?: string;
  phone?: string;
  nationality?: string;
  passportNumber?: string;
}

export function emptyTraveler(): TravelerDraft {
  return { fullName: "", type: "adult" };
}

export function TravelerFields({
  travelers,
  onChange,
  onAdd,
  onRemove,
  savedTravelers,
  requireDocuments,
  max,
}: {
  travelers: TravelerDraft[];
  onChange: (index: number, patch: Partial<TravelerDraft>) => void;
  onAdd: (prefill?: TravelerDraft) => void;
  onRemove: (index: number) => void;
  savedTravelers: SavedTraveler[];
  requireDocuments: boolean;
  max: number;
}) {
  const used = new Set(travelers.map((t) => t.fullName));
  const suggestions = savedTravelers.filter((t) => !used.has(t.fullName));

  return (
    <div className="space-y-4">
      {travelers.map((traveler, index) => (
        <fieldset
          key={index}
          className="rounded-card border border-line bg-surface-muted/30 p-4"
        >
          <legend className="px-1 text-sm font-medium text-ink">
            {index === 0 ? "Lead traveller" : `Traveller ${index + 1}`}
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Full name</span>
              <input
                type="text"
                autoComplete={index === 0 ? "name" : "off"}
                value={traveler.fullName}
                onChange={(event) => onChange(index, { fullName: event.target.value })}
                placeholder="As it appears on their ID"
                className={cn(controlClasses(false), "h-11")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Traveller type</span>
              <select
                value={traveler.type}
                onChange={(event) =>
                  onChange(index, { type: event.target.value as TravelerDraft["type"] })
                }
                className={cn(controlClasses(false), "h-11")}
              >
                <option value="adult">Adult</option>
                <option value="child">Child (2–11)</option>
                <option value="infant">Infant (under 2)</option>
              </select>
            </label>

            {index === 0 && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={traveler.email ?? ""}
                    onChange={(event) => onChange(index, { email: event.target.value })}
                    className={cn(controlClasses(false), "h-11")}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Mobile</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={traveler.phone ?? ""}
                    onChange={(event) => onChange(index, { phone: event.target.value })}
                    placeholder="+1 415 555 0142"
                    className={cn(controlClasses(false), "h-11")}
                  />
                </label>
              </>
            )}

            {requireDocuments && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Nationality</span>
                  <input
                    type="text"
                    value={traveler.nationality ?? ""}
                    onChange={(event) => onChange(index, { nationality: event.target.value })}
                    placeholder="e.g. BD"
                    maxLength={2}
                    className={cn(controlClasses(false), "h-11 uppercase")}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">
                    Passport / NID number
                  </span>
                  <input
                    type="text"
                    value={traveler.passportNumber ?? ""}
                    onChange={(event) =>
                      onChange(index, { passportNumber: event.target.value })
                    }
                    className={cn(controlClasses(false), "h-11 font-mono")}
                  />
                </label>
              </>
            )}
          </div>

          {index > 0 && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove traveller {index + 1}
            </button>
          )}
        </fieldset>
      ))}

      {travelers.length < max && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAdd()}
            className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3.5 py-1.5 text-sm font-medium text-body transition-colors hover:border-primary hover:text-primary"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Add traveller
          </button>
          {suggestions.slice(0, 4).map((saved) => (
            <button
              key={saved.id}
              type="button"
              onClick={() =>
                onAdd({
                  fullName: saved.fullName,
                  type: "adult",
                  email: saved.email,
                  phone: saved.phone,
                  nationality: saved.nationality,
                  passportNumber: saved.passportNumber,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-3.5 py-1.5 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {saved.fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
