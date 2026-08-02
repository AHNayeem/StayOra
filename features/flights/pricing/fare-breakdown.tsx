"use client";

import { Info } from "lucide-react";
import type { FareBreakdown, PassengerType } from "@/types/flight";
import type { AncillaryLine } from "@/lib/mock/ancillaries";
import { PASSENGER_TYPE_LABEL } from "@/lib/mock/passengers";
import { useLocale } from "@/features/i18n";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FareBreakdownPanelProps {
  fare: FareBreakdown;
  /** Seat surcharges, USD. Omitted from the panel when zero. */
  seatsUsd?: number;
  /** Resolved ancillary line items. */
  ancillaries?: AncillaryLine[];
  /** Coupon reduction, USD. */
  couponDiscountUsd?: number;
  couponCode?: string;
  /** Overrides the computed total — pass the booking's stored grand total. */
  grandTotalUsd?: number;
  className?: string;
}

/**
 * FareBreakdownPanel — the itemised price, used identically on the details page,
 * the booking review step and the ticket.
 *
 * One component for all three on purpose: the single most damaging bug in a
 * booking flow is a total that differs between the screen that quoted it and the
 * screen that charged it. Sharing the renderer means they cannot disagree about
 * formatting, rounding or which lines are included.
 */
export function FareBreakdownPanel({
  fare,
  seatsUsd = 0,
  ancillaries = [],
  couponDiscountUsd = 0,
  couponCode,
  grandTotalUsd,
  className,
}: FareBreakdownPanelProps) {
  const { money } = useLocale();

  const ancillariesUsd = ancillaries.reduce((sum, line) => sum + line.totalUsd, 0);
  const total =
    grandTotalUsd ??
    Math.max(0, fare.totalUsd + seatsUsd + ancillariesUsd - couponDiscountUsd);

  return (
    <div className={cn("text-sm", className)}>
      <dl className="space-y-2">
        {/* Per-passenger-type fare lines */}
        {fare.lines.map((line) => (
          <Row
            key={line.type}
            label={`${line.count} × ${PASSENGER_TYPE_LABEL[line.type as PassengerType]}`}
            hint={`${money(line.baseUsd)} base + ${money(line.taxesUsd)} taxes each`}
            value={money((line.baseUsd + line.taxesUsd) * line.count)}
          />
        ))}

        <div className="border-t border-line pt-2">
          <Row label="Base fare" value={money(fare.baseFareUsd)} muted />
          <Row
            label="Taxes & carrier charges"
            value={money(fare.taxesUsd)}
            muted
            tooltip="Government taxes, airport charges and airline-imposed surcharges. Collected on the airline's behalf."
          />
          <Row
            label="Otithee booking fee"
            value={money(fare.serviceFeeUsd)}
            muted
            tooltip="Our fee for booking, ticketing and supporting this reservation."
          />
          {fare.discountUsd > 0 && (
            <Row
              label="Airline promotion"
              value={`− ${money(fare.discountUsd)}`}
              tone="success"
            />
          )}
        </div>

        {seatsUsd > 0 && (
          <div className="border-t border-line pt-2">
            <Row label="Seat selection" value={money(seatsUsd)} />
          </div>
        )}

        {ancillaries.length > 0 && (
          <div className="space-y-2 border-t border-line pt-2">
            {ancillaries.map((line) => (
              <Row
                key={line.option.id}
                label={line.option.label}
                hint={
                  line.units > 1
                    ? `${line.units} × ${line.option.free ? "included" : money(line.option.priceUsd)}`
                    : undefined
                }
                value={line.option.free ? "Included" : money(line.totalUsd)}
                tone={line.option.free ? "success" : undefined}
              />
            ))}
          </div>
        )}

        {couponDiscountUsd > 0 && (
          <div className="border-t border-line pt-2">
            <Row
              label={couponCode ? `Coupon ${couponCode}` : "Coupon"}
              value={`− ${money(couponDiscountUsd)}`}
              tone="success"
            />
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t-2 border-line pt-3">
        <span className="font-semibold text-ink">Total</span>
        <span className="text-xl font-bold text-accent-600">{money(total)}</span>
      </div>
      <p className="mt-1 text-right text-xs text-muted">
        for {fare.lines.reduce((n, l) => n + l.count, 0)} traveller
        {fare.lines.reduce((n, l) => n + l.count, 0) === 1 ? "" : "s"}, all taxes included
      </p>
    </div>
  );
}

function Row({
  label,
  hint,
  value,
  muted,
  tone,
  tooltip,
}: {
  label: string;
  hint?: string;
  value: string;
  muted?: boolean;
  tone?: "success";
  tooltip?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <dt className={cn("min-w-0", muted ? "text-muted" : "text-body")}>
        <span className="inline-flex items-center gap-1">
          <span className="truncate">{label}</span>
          {tooltip && (
            <Tooltip content={tooltip}>
              <Info className="size-3 shrink-0 text-muted" aria-hidden="true" />
            </Tooltip>
          )}
        </span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </dt>
      <dd
        className={cn(
          "shrink-0 tabular-nums",
          tone === "success" ? "font-medium text-success" : muted ? "text-muted" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
