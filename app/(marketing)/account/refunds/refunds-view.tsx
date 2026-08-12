"use client";

import Link from "next/link";
import { BanknoteArrowDown, Clock } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useMyRefunds } from "@/features/account/refunds";
import { REFUND_STATUSES } from "@/features/dashboard/domain/lifecycle";
import { labelMap } from "@/features/dashboard/lib/status";
import type { RefundStatus } from "@/features/dashboard/domain/types";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, type StatusTone } from "@/components/account/status-badge";
import { Money } from "@/components/account/money";
import { useLocale } from "@/features/i18n";
import { buttonVariants } from "@/components/ui/button";

const statusLabel = labelMap(REFUND_STATUSES);

/** Map the platform refund status onto the account area's badge tones. */
const TONE: Record<RefundStatus, StatusTone> = {
  requested: "warning",
  under_review: "info",
  approved: "info",
  rejected: "danger",
  processing: "warning",
  completed: "success",
  failed: "danger",
};

/** What each status means for the customer, in plain words. */
const EXPLAINER: Record<RefundStatus, string> = {
  requested: "We've received your request and it's queued for review.",
  under_review: "Our team is checking your booking against its cancellation policy.",
  approved: "Approved — the payment is being prepared for return.",
  rejected: "No refund was due under the booking's cancellation policy.",
  processing: "Sent to your bank or card provider. This usually takes 3–5 working days.",
  completed: "Refunded to your original payment method.",
  failed: "The return failed at your provider — our team will arrange another way.",
};

/**
 * Refunds — the customer's view of the platform refund queue.
 *
 * These are the same records the platform's finance team works from, so a status
 * change on their side shows here without a second source of truth.
 */
export function RefundsView() {
  const { user } = useAuth();
  const { date } = useLocale();
  const refunds = useMyRefunds(user?.email ?? "");

  const pending = refunds.filter(
    (r) => r.status !== "completed" && r.status !== "rejected",
  ).length;

  return (
    <div>
      <AccountPageHeader
        title="Refunds"
        description={
          refunds.length > 0
            ? `${refunds.length} request${refunds.length === 1 ? "" : "s"}${pending > 0 ? ` · ${pending} in progress` : ""}`
            : "Track refunds for cancelled or failed bookings."
        }
      />

      {refunds.length === 0 ? (
        <AccountEmpty
          icon={BanknoteArrowDown}
          title="No refunds yet"
          description="When you cancel an eligible booking — or a booking fails after payment — the refund request will appear here with its live status."
          action={
            <Link
              href="/account/bookings"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              View my bookings
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {refunds.map((refund) => (
            <li
              key={refund.id}
              className="rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{refund.reference}</p>
                  <p className="text-sm text-muted">
                    Booking {refund.bookingRef} · requested {date(refund.requestedAt)}
                  </p>
                </div>
                <StatusBadge
                  label={statusLabel[refund.status]}
                  tone={TONE[refund.status]}
                />
              </div>

              <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Booking total</dt>
                  <dd className="text-sm font-medium text-ink">
                    <Money usd={refund.originalAmount} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Cancellation fee</dt>
                  <dd className="text-sm font-medium text-ink">
                    {refund.cancellationFee > 0 ? (
                      <>
                        −<Money usd={refund.cancellationFee} />
                      </>
                    ) : (
                      "None"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Refund amount</dt>
                  <dd className="text-sm font-bold text-accent-600">
                    <Money usd={refund.refundAmount} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Method</dt>
                  <dd className="text-sm text-ink">{refund.method}</dd>
                </div>
              </dl>

              <p className="mt-3 flex items-start gap-2 rounded-field bg-surface-muted/60 p-3 text-sm text-body">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {EXPLAINER[refund.status]}
                {refund.decisionNote ? ` ${refund.decisionNote}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/account/payments"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View payments
                </Link>
                <Link
                  href="/account/messages"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Ask about this refund
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
