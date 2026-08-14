"use client";

import { Check, Circle } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "../../ui";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { BASIS_LABELS } from "../../domain/commission-rules";
import type { Booking } from "../../domain/types";
import { useCommissionLifecycle } from "./rules-hooks";

/**
 * The commission breakdown and lifecycle for one booking.
 *
 * Everything shown is read off `booking.money`, which the money engine derived
 * once — this component never multiplies a rate by an amount. The lifecycle
 * below it is the accrual → finalisation → settlement → reversal chain the
 * booking has actually walked.
 */
export function CommissionLifecycle({ booking }: { booking: Booking }) {
  const lifecycle = useCommissionLifecycle(booking.id);
  const m = booking.money;
  const stages = lifecycle.data?.stages ?? [];

  return (
    <Panel flush>
      <PanelHeader
        title="Commission & platform revenue"
        description="How this booking's value is split, and where the commission is in its lifecycle."
      />
      <PanelBody>
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <Row label="Booking value (customer paid)" value={m.total} currency={m.currency} strong />
          <Row label="Net sale" value={m.netSale} currency={m.currency} />
          <Row label="Taxes (collected for the authority)" value={m.taxes} currency={m.currency} muted />
          {m.discount > 0 && (
            <Row label="Discount" value={m.discount} currency={m.currency} negative />
          )}
          {m.platformFundedDiscount > 0 && (
            <Row
              label="— platform-funded"
              value={m.platformFundedDiscount}
              currency={m.currency}
              negative
              muted
            />
          )}
          <Row
            label={`Platform commission (${m.commissionRate}% of ${BASIS_LABELS[m.commissionBasis].toLowerCase()})`}
            value={m.commission}
            currency={m.currency}
          />
          <Row label="Service fee" value={m.fees} currency={m.currency} />
          {m.insurance > 0 && (
            <>
              <Row label="Insurance premium" value={m.insurance} currency={m.currency} muted />
              <Row
                label="— provider share"
                value={m.insuranceProviderShare}
                currency={m.currency}
                muted
              />
              <Row label="Insurance commission" value={m.insuranceRevenue} currency={m.currency} />
            </>
          )}
          {m.platformCancellationFee > 0 && (
            <Row
              label="Cancellation administration fee"
              value={m.platformCancellationFee}
              currency={m.currency}
            />
          )}
          {m.commissionReversed > 0 && (
            <Row
              label="Commission reversed"
              value={m.commissionReversed}
              currency={m.currency}
              negative
            />
          )}
          <div className="sm:col-span-2 mt-2 grid gap-x-8 gap-y-2 border-t-2 border-line pt-3 sm:grid-cols-2">
            <Row label="Merchant payable" value={m.netSettlement} currency={m.currency} strong />
            <Row
              label="Platform revenue"
              value={m.platformRevenue}
              currency={m.currency}
              strong
              accent
            />
          </div>
        </dl>

        <ol className="mt-6 space-y-3">
          {stages.map((stage) => (
            <li key={stage.key} className="flex gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                  stage.done
                    ? "bg-primary-50 text-primary-700"
                    : "bg-surface-muted text-muted",
                )}
              >
                {stage.done ? <Check className="size-3.5" /> : <Circle className="size-2.5" />}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    stage.done ? "text-ink" : "text-muted",
                  )}
                >
                  {stage.label}
                  {stage.done && stage.amount > 0 && (
                    <span className="ml-2 tabular-nums text-body">
                      {formatCurrency(stage.amount, m.currency)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {stage.note}
                  {stage.at ? ` · ${formatDateTime(stage.at)}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </PanelBody>
    </Panel>
  );
}

function Row({
  label,
  value,
  currency,
  negative,
  muted,
  strong,
  accent,
}: {
  label: string;
  value: number;
  currency: string;
  negative?: boolean;
  muted?: boolean;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-1.5">
      <dt className={cn("text-sm", muted ? "text-muted" : "text-body")}>{label}</dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          muted ? "text-xs text-muted" : "text-sm",
          negative && "font-semibold text-danger",
          strong && !accent && "font-bold text-ink",
          accent && "font-bold text-primary-700",
          !negative && !strong && !muted && "font-medium text-ink",
        )}
      >
        {negative && value > 0 ? "−" : ""}
        {formatCurrency(value, currency)}
      </dd>
    </div>
  );
}
