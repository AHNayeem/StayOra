"use client";

import { useState } from "react";
import {
  Award,
  Check,
  Copy,
  Gift,
  Hourglass,
  Minus,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import {
  LOYALTY_TIERS,
  POINT_VALUE_USD,
  REFERRAL_REWARD_POINTS,
  referralService,
  type LoyaltyEntry,
  type Referral,
} from "@/features/dashboard/domain";
import { useCustomerEmail, useDomainValue, useLoyalty } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { StatusBadge, type StatusTone } from "@/components/account/status-badge";
import { Button } from "@/components/ui/button";
import { controlClasses } from "@/components/ui/field";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const REFERRAL_META: Record<Referral["status"], { label: string; tone: StatusTone }> = {
  invited: { label: "Invited", tone: "neutral" },
  signed_up: { label: "Signed up", tone: "info" },
  booked: { label: "Booked — reward pending", tone: "warning" },
  rewarded: { label: "Rewarded", tone: "success" },
};

/**
 * Rewards — the loyalty ledger, tier benefits and referrals.
 *
 * The balance is the sum of the ledger, not a stored number: points credited
 * when a booking completes and clawed back when it is refunded both show here
 * because they are entries, and checkout spends against the same balance.
 */
export function RewardsView() {
  const { number, date, money } = useLocale();
  const email = useCustomerEmail();
  const summary = useLoyalty();
  const referrals = useDomainValue(() => referralService.summary(email), [email]);
  const [invite, setInvite] = useState("");

  return (
    <div>
      <AccountPageHeader
        title="Rewards"
        description="Earn points on every booking and spend them at checkout."
      />

      <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
        <div className="rounded-card border border-line bg-linear-to-br from-primary to-primary-700 p-6 text-white shadow-card">
          <div className="flex items-center gap-2 text-white/80">
            <Gift className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">Points balance</span>
          </div>
          <p className="mt-2 text-4xl font-extrabold">{number(summary.balance)}</p>
          <p className="mt-1 text-sm text-white/80">
            Worth about {money(summary.balance * POINT_VALUE_USD)} at checkout ·{" "}
            {number(summary.lifetimeEarned)} earned all-time
          </p>
          {summary.expiringSoon > 0 && (
            <p className="mt-3 flex items-center gap-1.5 rounded-field bg-white/15 px-3 py-1.5 text-xs">
              <Hourglass className="size-3.5" aria-hidden="true" />
              {number(summary.expiringSoon)} points expire in the next 90 days
            </p>
          )}
        </div>

        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2">
            <Award className="size-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">{summary.tier.name} tier</span>
          </div>
          {summary.nextTier ? (
            <>
              <p className="mt-2 text-sm text-body">
                <span className="font-semibold text-ink">
                  {number(summary.pointsToNextTier)}
                </span>{" "}
                points to {summary.nextTier.name}
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
          <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
            {summary.tier.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-body">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tier ladder */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Tiers</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LOYALTY_TIERS.map((tier) => {
          const current = tier.id === summary.tier.id;
          const reached = summary.lifetimeEarned >= tier.threshold;
          return (
            <li
              key={tier.id}
              className={cn(
                "rounded-card border p-4",
                current ? "border-primary bg-primary-50/60" : "border-line bg-surface",
              )}
            >
              <p className="flex items-center justify-between text-sm font-semibold text-ink">
                {tier.name}
                {current && (
                  <span className="rounded-pill bg-primary px-2 py-0.5 text-[11px] text-white">
                    You
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {number(tier.threshold)} lifetime points · {tier.earnMultiplier}× earning
              </p>
              <ul className="mt-2 space-y-1 text-xs text-body">
                {tier.benefits.slice(0, 2).map((benefit) => (
                  <li key={benefit} className={cn(!reached && "opacity-60")}>
                    · {benefit}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {/* Referrals */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Refer a friend</h2>
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm text-body">
          Share your code. When someone books for the first time you both get{" "}
          <strong className="text-ink">{number(REFERRAL_REWARD_POINTS)} points</strong>.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-field border border-dashed border-primary bg-primary-50 px-4 py-2 font-mono text-base font-semibold text-primary-700">
            {referrals.code}
          </code>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              void navigator.clipboard?.writeText(referrals.code);
              toast.success("Code copied");
            }}
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
          <Stat label="Invited" value={number(referrals.invited)} />
          <Stat label="Signed up" value={number(referrals.signedUp)} />
          <Stat label="Points earned" value={number(referrals.pointsEarned)} />
          <Stat label="Pending" value={number(referrals.pointsPending)} />
        </div>

        <form
          className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            const address = invite.trim();
            if (!address.includes("@")) return;
            referralService.invite(email, address);
            setInvite("");
            toast.success("Invitation sent", { description: `We've emailed ${address}.` });
          }}
        >
          <input
            type="email"
            value={invite}
            onChange={(event) => setInvite(event.target.value)}
            placeholder="friend@example.com"
            aria-label="Friend's email address"
            className={cn(controlClasses(false), "h-11 min-w-56 flex-1")}
          />
          <Button type="submit" variant="primary" size="md" disabled={!invite.includes("@")}>
            <Send className="size-4" aria-hidden="true" />
            Send invite
          </Button>
        </form>

        {referrals.rows.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {referrals.rows.map((referral) => {
              const meta = REFERRAL_META[referral.status];
              return (
                <li key={referral.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-primary">
                    <Users className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {referral.inviteeName ?? referral.inviteeEmail}
                    </span>
                    <span className="block text-xs text-muted">
                      Invited {date(referral.invitedAt)}
                      {referral.bookingRef ? ` · ${referral.bookingRef}` : ""}
                    </span>
                  </span>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Ledger */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Points activity</h2>
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        {summary.entries.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No points movements yet — your first completed booking will start the ledger.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.entries.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} date={date} number={number} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function LedgerRow({
  entry,
  date,
  number,
}: {
  entry: LoyaltyEntry;
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
          {entry.direction} · {date(entry.at)}
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
