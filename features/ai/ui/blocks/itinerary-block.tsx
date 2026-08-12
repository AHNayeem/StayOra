"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  BusFront,
  Coffee,
  ExternalLink,
  Plane,
  Plus,
  Share2,
  Sparkles,
  Ticket,
  Trash2,
  Utensils,
} from "lucide-react";
import type { AIBlock, AITripDay, AITripDayItem } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { promptForPlan, saveTrip, tripFromPlan } from "../../saved-trips";
import { BlockShell } from "./block-shell";

type ItineraryBlock = Extract<AIBlock, { kind: "itinerary" }>;

const ICONS: Record<AITripDayItem["kind"], React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  transport: BusFront,
  stay: Bookmark,
  activity: Ticket,
  tour: Sparkles,
  meal: Utensils,
  free: Coffee,
};

/**
 * ItineraryBlock — the editable day-by-day plan.
 *
 * Edits are held locally rather than pushed back into the conversation: the
 * message log is a record of what the assistant said, and rewriting history
 * every time someone drags an activity would make "retry" meaningless. Moving
 * or removing an entry is a view-level arrangement; anything that changes the
 * *trip* (adding an activity, swapping the hotel) goes back through the
 * assistant so the budget and plan stay in sync with real inventory.
 */
export function ItineraryBlock({
  block,
  onAsk,
}: {
  block: ItineraryBlock;
  onAsk?: (prompt: string) => void;
}) {
  const { money, date } = useLocale();
  const { plan } = block;
  const [days, setDays] = useState<AITripDay[]>(plan.days);
  const [saved, setSaved] = useState(false);

  const removedCount = useMemo(
    () =>
      plan.days.reduce((sum, day) => sum + day.items.length, 0) -
      days.reduce((sum, day) => sum + day.items.length, 0),
    [plan.days, days],
  );

  const remove = (dayIndex: number, itemId: string) => {
    setDays((prev) =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, items: day.items.filter((i) => i.id !== itemId) } : day,
      ),
    );
    toast.info("Removed from itinerary", { description: "Ask me to add something else." });
  };

  /** Move an entry to the previous or next day. */
  const move = (dayIndex: number, itemId: string, direction: -1 | 1) => {
    const targetIndex = dayIndex + direction;
    if (targetIndex < 0 || targetIndex >= days.length) return;
    setDays((prev) => {
      const item = prev[dayIndex].items.find((i) => i.id === itemId);
      if (!item) return prev;
      return prev.map((day, index) => {
        if (index === dayIndex) return { ...day, items: day.items.filter((i) => i.id !== itemId) };
        if (index === targetIndex) return { ...day, items: [...day.items, item] };
        return day;
      });
    });
    toast.success(`Moved to day ${targetIndex + 1}`);
  };

  const onSave = () => {
    const isNew = saveTrip(tripFromPlan(plan));
    setSaved(true);
    toast.success(isNew ? "Trip saved" : "Trip updated", {
      description: `${plan.days.length}-day ${plan.destination} trip`,
    });
  };

  const onShare = async () => {
    // The plan is reproducible from its prompt, so the link genuinely rebuilds
    // this itinerary rather than pointing at a screenshot of it.
    const url = `${window.location.origin}/ai?ask=${encodeURIComponent(promptForPlan(plan))}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.copied("Trip link copied");
    } catch {
      toast.error("Couldn't copy the link — your browser blocked clipboard access.");
    }
  };

  return (
    <BlockShell
      title="Day-by-day itinerary"
      action={
        <div className="flex items-center gap-1">
          <IconAction label="Save trip" onClick={onSave} active={saved}>
            <Bookmark className={cn("size-3.5", saved && "fill-current")} />
          </IconAction>
          <IconAction label="Share trip" onClick={onShare}>
            <Share2 className="size-3.5" />
          </IconAction>
        </div>
      }
    >
      <ol className="divide-y divide-line">
        {days.map((day, dayIndex) => (
          <li key={day.day} className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-ink">
                Day {day.day} · {day.title}
              </h4>
              {day.date && (
                <span className="text-xs text-muted">
                  {date(day.date, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              )}
            </div>

            <ul className="mt-2 space-y-2">
              {day.items.map((item) => {
                const Icon = ICONS[item.kind];
                return (
                  <li
                    key={item.id}
                    className="group flex items-start gap-2.5 rounded-field border border-line px-3 py-2"
                  >
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-field bg-surface-muted text-primary">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-ink">
                        {item.time && <span className="text-xs text-muted">{item.time}</span>}
                        {item.title}
                      </p>
                      {item.detail && (
                        <p className="truncate text-xs text-muted">{item.detail}</p>
                      )}
                      {item.priceUsd !== undefined && item.priceUsd > 0 && (
                        <p className="mt-0.5 text-xs font-semibold text-accent-600">
                          {money(item.priceUsd)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      {item.href && (
                        <IconAction label={`View ${item.title}`} href={item.href}>
                          <ExternalLink className="size-3.5" />
                        </IconAction>
                      )}
                      <IconAction
                        label={`Move ${item.title} to the previous day`}
                        onClick={() => move(dayIndex, item.id, -1)}
                        disabled={dayIndex === 0}
                      >
                        <ArrowUp className="size-3.5" />
                      </IconAction>
                      <IconAction
                        label={`Move ${item.title} to the next day`}
                        onClick={() => move(dayIndex, item.id, 1)}
                        disabled={dayIndex === days.length - 1}
                      >
                        <ArrowDown className="size-3.5" />
                      </IconAction>
                      <IconAction
                        label={`Remove ${item.title}`}
                        onClick={() => remove(dayIndex, item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconAction>
                    </div>
                  </li>
                );
              })}

              {day.items.length === 0 && (
                <li className="rounded-field border border-dashed border-line px-3 py-3 text-xs text-muted">
                  Nothing planned yet.
                </li>
              )}
            </ul>

            {onAsk && (
              <button
                type="button"
                onClick={() => onAsk(`Add an activity in ${plan.destination}`)}
                className="mt-2 inline-flex items-center gap-1 rounded-pill border border-dashed border-line px-3 py-1 text-xs font-semibold text-body transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Add activity
              </button>
            )}
          </li>
        ))}
      </ol>

      {removedCount > 0 && (
        <p className="border-t border-line bg-surface-muted px-4 py-2 text-xs text-muted">
          {removedCount} {removedCount === 1 ? "entry" : "entries"} removed from this view — the
          costed budget above still reflects the full plan.
        </p>
      )}
    </BlockShell>
  );
}

/** A small square action — rendered as a link when `href` is given. */
function IconAction({
  label,
  href,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  const className = cn(
    "grid size-7 place-items-center rounded-field text-muted transition-colors",
    "hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    disabled && "pointer-events-none opacity-30",
    active && "text-primary",
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={className}
    >
      {children}
    </button>
  );
}
