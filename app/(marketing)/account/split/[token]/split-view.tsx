"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, CreditCard, TriangleAlert, Users } from "lucide-react";
import {
  SPLIT_WINDOW_HOURS,
  collectedUsd,
  coverRemaining,
  getRevision,
  outstandingUsd,
  payShare,
  remindOutstanding,
  shareByToken,
  subscribe,
} from "@/features/dashboard/domain";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/**
 * Settling one share of a group booking.
 *
 * The link is the credential: anyone holding it can pay that share, which is
 * how these links work in practice and is why the page never asks the visitor to
 * be the person named on it. The organiser gets the extra controls — remind, and
 * cover the balance — because only they can be charged for someone else's share.
 */
export function SplitShareView({ token }: { token: string }) {
  const { money, dateTime } = useLocale();
  const { user } = useAuth();
  const revision = useSyncExternalStore(subscribe, getRevision, () => 0);
  const [busy, setBusy] = useState(false);

  void revision;
  const found = shareByToken(token);

  if (!found) {
    return (
      <div>
        <AccountPageHeader title="Split payment" />
        <AccountEmpty
          icon={Users}
          title="This payment link isn't valid"
          description="It may have been settled already, or the booking behind it was cancelled. Ask whoever organised the trip to send a fresh link."
          action={
            <Link href="/account/bookings" className={buttonVariants({ variant: "primary", size: "sm" })}>
              My bookings
            </Link>
          }
        />
      </div>
    );
  }

  const { split, share } = found;
  const isOrganiser = user?.email?.toLowerCase() === split.organiserEmail.toLowerCase();
  const settled = share.status === "paid" || share.status === "covered";
  const outstanding = outstandingUsd(split);
  const collected = collectedUsd(split);

  const onPay = () => {
    setBusy(true);
    try {
      const result = payShare(token);
      if (result.ok) toast.success("Payment received", { description: result.message });
      else toast.error("That didn't go through", { description: result.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AccountPageHeader
        title={`Your share of ${split.productTitle}`}
        description={`${split.organiserName} split ${money(split.totalUsd)} between ${split.shares.length} people. Booking ${split.bookingRef}.`}
      />

      <section className="rounded-panel border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Your share</p>
            <p className="text-h2 font-bold text-accent-600">{money(share.amountUsd)}</p>
            <p className="mt-1 text-xs text-muted">
              {settled
                ? `Paid ${share.paidAt ? dateTime(share.paidAt) : ""}${
                    share.paymentRef ? ` · ${share.paymentRef}` : ""
                  }`
                : `Due within ${SPLIT_WINDOW_HOURS} hours of booking · window closes ${dateTime(split.expiresAt)}`}
            </p>
          </div>
          {settled ? (
            <Badge variant="success">
              <Check className="mr-1 size-3.5" aria-hidden="true" />
              {share.status === "covered" ? "Covered by the organiser" : "Paid"}
            </Badge>
          ) : (
            <Button
              leftIcon={<CreditCard className="size-4" />}
              loading={busy}
              onClick={onPay}
              disabled={split.status === "cancelled"}
            >
              Pay {money(share.amountUsd)}
            </Button>
          )}
        </div>

        {share.status === "declined" && share.declineReason && (
          <p className="mt-3 flex items-start gap-2 rounded-field bg-danger/10 p-3 text-sm text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {share.declineReason} Try again — a second attempt uses a different route.
          </p>
        )}

        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Collected so far</dt>
            <dd className="font-medium text-ink">
              {money(collected)} of {money(split.totalUsd)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Still outstanding</dt>
            <dd className="font-medium text-ink">{money(outstanding)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-ink">Everyone on this booking</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {split.shares.map((row) => {
            const done = row.status === "paid" || row.status === "covered";
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-field border border-line bg-surface p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {row.name || row.email}
                    {row.organiser && (
                      <span className="ml-1.5 text-xs font-normal text-muted">organiser</span>
                    )}
                    {row.id === share.id && (
                      <span className="ml-1.5 text-xs font-normal text-primary">you</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{row.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium tabular-nums text-ink">{money(row.amountUsd)}</span>
                  {done ? (
                    <Badge variant="success">
                      {row.status === "covered" ? "Covered" : "Paid"}
                    </Badge>
                  ) : row.status === "declined" ? (
                    <Badge variant="danger">Declined</Badge>
                  ) : (
                    <Badge variant="neutral">Pending</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {isOrganiser && outstanding > 0 && split.status !== "cancelled" && (
        <section className="mt-6 rounded-panel border border-primary/25 bg-primary-50/50 p-5">
          <h2 className="text-sm font-semibold text-ink">Your options as organiser</h2>
          <p className="mt-1 text-xs text-muted">
            The booking is already confirmed and holding your room — nothing is at risk while
            people settle up.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sent = remindOutstanding(split.id);
                toast.success(
                  sent > 0
                    ? `Reminder sent to ${sent} ${sent === 1 ? "person" : "people"}`
                    : "Everyone has paid — nothing to chase",
                );
              }}
            >
              Send a reminder
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const result = coverRemaining(split.id);
                toast.success(`You covered ${money(result.amountUsd)}`, {
                  description: `${result.covered} share${result.covered === 1 ? "" : "s"} settled to your card. The booking is paid in full.`,
                });
              }}
            >
              Cover the remaining {money(outstanding)}
            </Button>
          </div>
        </section>
      )}

      <Link
        href={`/account/bookings/${split.bookingId}`}
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        View the booking →
      </Link>
    </div>
  );
}
