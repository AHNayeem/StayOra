"use client";

import { Award, Gift, Minus, Plus, Sparkles } from "lucide-react";
import type { RewardEntry, RewardsSummary } from "@/types/traveler";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { cn } from "@/lib/utils";

export function RewardsView({ summary }: { summary: RewardsSummary }) {
  const { number, date } = useLocale();

  return (
    <div>
      <AccountPageHeader
        title="Rewards"
        description="Earn points on every booking and redeem them for travel credit."
      />

      {/* Balance + tier */}
      <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
        <div className="rounded-card border border-line bg-linear-to-br from-primary to-primary-700 p-6 text-white shadow-card">
          <div className="flex items-center gap-2 text-white/80">
            <Gift className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">Points balance</span>
          </div>
          <p className="mt-2 text-4xl font-extrabold">{number(summary.balance)}</p>
          <p className="mt-1 text-sm text-white/80">
            {number(summary.lifetimeEarned)} earned all-time
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Award className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium capitalize text-ink">{summary.tier} tier</span>
          </div>
          {summary.nextTier ? (
            <>
              <p className="mt-2 text-sm text-body">
                <span className="font-semibold text-ink">
                  {number(summary.pointsToNextTier)}
                </span>{" "}
                points to <span className="capitalize">{summary.nextTier}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round(summary.progress * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-body">
              <Sparkles className="size-4 text-warning" aria-hidden="true" />
              You&apos;ve reached the top tier!
            </p>
          )}
        </div>
      </div>

      {/* Ledger */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Points activity</h2>
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <ul className="divide-y divide-line">
          {summary.entries.map((entry) => (
            <LedgerRow key={entry.id} entry={entry} date={date} number={number} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function LedgerRow({
  entry,
  date,
  number,
}: {
  entry: RewardEntry;
  date: (iso: string) => string;
  number: (n: number) => string;
}) {
  const isCredit = entry.direction === "earned" || entry.direction === "bonus";
  return (
    <li className="flex items-center gap-3 p-4">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          isCredit ? "bg-emerald-500/12 text-emerald-600" : "bg-surface-muted text-muted",
        )}
      >
        {isCredit ? (
          <Plus className="size-4" aria-hidden="true" />
        ) : (
          <Minus className="size-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{entry.description}</p>
        <p className="text-xs capitalize text-muted">
          {entry.direction} · {date(entry.date)}
          {entry.bookingRef ? ` · ${entry.bookingRef}` : ""}
        </p>
      </div>
      <span className={cn("font-bold", isCredit ? "text-emerald-600" : "text-muted")}>
        {isCredit ? "+" : "−"}
        {number(entry.points)}
      </span>
    </li>
  );
}
