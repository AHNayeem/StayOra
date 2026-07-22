"use client";

import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import type { PaymentTxn } from "@/types/traveler";
import { useLocale } from "@/features/i18n";
import { useMergedPayments } from "@/features/account/created-bookings";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { AccountStat } from "@/components/account/account-stat";
import { StatusBadge, paymentStatusMeta } from "@/components/account/status-badge";
import { Money } from "@/components/account/money";
import { cn } from "@/lib/utils";

export function PaymentsView({ payments: serverPayments }: { payments: PaymentTxn[] }) {
  const { date } = useLocale();
  const payments = useMergedPayments(serverPayments);

  const totalPaid = payments
    .filter((p) => p.type === "charge" && p.status === "succeeded")
    .reduce((s, p) => s + p.amountUsd, 0);
  const totalRefunded = payments
    .filter((p) => p.type === "refund")
    .reduce((s, p) => s + p.amountUsd, 0);

  if (payments.length === 0) {
    return (
      <div>
        <AccountPageHeader title="Payments" description="Your payment and refund history." />
        <AccountEmpty
          icon={Wallet}
          title="No payments yet"
          description="Your charges and refunds will be listed here."
        />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="Payments"
        description="A full record of your charges and refunds."
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <AccountStat label="Total paid" value={<Money usd={totalPaid} />} icon={ArrowUpRight} />
        <AccountStat
          label="Total refunded"
          value={<Money usd={totalRefunded} />}
          icon={ArrowDownLeft}
        />
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <ul className="divide-y divide-line">
          {payments.map((p) => {
            const meta = paymentStatusMeta(p.status);
            const isRefund = p.type === "refund";
            return (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    isRefund ? "bg-emerald-500/12 text-emerald-600" : "bg-primary-50 text-primary",
                  )}
                >
                  {isRefund ? (
                    <ArrowDownLeft className="size-5" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="size-5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{p.description}</p>
                  <p className="truncate text-xs text-muted">
                    {p.method} · {date(p.date)}
                    {p.bookingRef ? ` · Ref ${p.bookingRef}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={cn(
                      "font-bold",
                      isRefund ? "text-emerald-600" : "text-ink",
                    )}
                  >
                    {isRefund ? "+" : "−"}
                    <Money usd={p.amountUsd} />
                  </span>
                  <StatusBadge label={meta.label} tone={meta.tone} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
