"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  financePeriodService,
  listPeriods,
  periodFigures,
  type FinancePeriod,
} from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { getErrorMessage } from "../../data";
import { Alert, Button, StatCard, StatusBadge } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useDomainActor } from "../../domain/use-domain";

/**
 * Financial period close.
 *
 * Every revenue figure in this prototype is derived on read, which keeps the
 * books consistent but means a refund raised today quietly changes what last
 * quarter earned. Closing a period freezes a snapshot: from then on the closed
 * month reports the numbers as they stood at close, and the audit trail records
 * who froze them.
 *
 * Reopening is allowed and audited — because in practice periods do get
 * reopened — and the superseded snapshot is kept rather than overwritten.
 */
export function PeriodsView() {
  const actor = useDomainActor();
  const [busy, setBusy] = useState<string | null>(null);
  const periods = useDomainValue<FinancePeriod[]>(() => listPeriods(12), []) ?? [];
  const currentId = new Date().toISOString().slice(0, 7);

  const close = async (period: FinancePeriod) => {
    setBusy(period.id);
    try {
      await financePeriodService.close(period.id, { actor });
      toast.success(`${period.label} closed`, {
        description: "Its figures are frozen — reports now read the snapshot.",
      });
    } catch (error) {
      toast.error("Not closed", { description: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const reopen = async (period: FinancePeriod) => {
    setBusy(period.id);
    try {
      await financePeriodService.reopen(period.id, {
        actor,
        reason: "Reopened from the finance dashboard.",
      });
      toast.success(`${period.label} reopened`, {
        description: "Figures are live again until it is closed.",
      });
    } catch (error) {
      toast.error("Not reopened", { description: getErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const closed = periods.filter((p) => p.status === "closed");
  const latestClosed = closed[0];

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Periods" value={String(periods.length)} icon="Calendar" />
        <StatCard label="Closed" value={String(closed.length)} icon="Lock" />
        <StatCard
          label="Last closed"
          value={latestClosed?.label ?? "—"}
          icon="CircleCheck"
        />
        <StatCard
          label="Frozen revenue"
          value={formatCurrency(latestClosed?.snapshot?.platformRevenue ?? 0, "USD")}
          icon="CircleDollarSign"
        />
      </div>

      <Alert tone="info" title="What closing does" className="mb-5">
        A closed month reports the figures as they stood at close, so a later refund cannot
        change a filed number. Open months stay live. The current month cannot be closed
        while it is still accumulating.
      </Alert>

      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[52rem] text-sm">
          <caption className="sr-only">Financial periods</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">GMV</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Platform revenue</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              const figures = period.snapshot ?? periodFigures(period.id);
              const isCurrent = period.id === currentId;
              return (
                <tr key={period.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{period.label}</p>
                    {period.closedAt && (
                      <p className="text-xs text-muted">
                        Closed {formatDateTime(period.closedAt)} by {period.closedBy}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {formatCurrency(figures.gmv, figures.currency)}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {formatCurrency(figures.commission, figures.currency)}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {formatCurrency(figures.platformRevenue, figures.currency)}
                  </td>
                  <td className="px-4 py-3 text-body">{figures.bookingCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={period.status === "closed" ? "success" : "neutral"}>
                      {period.status === "closed" ? "Closed" : isCurrent ? "Current" : "Open"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Can anyPermission={["finance:update"]}>
                      {period.status === "closed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={busy === period.id}
                          onClick={() => void reopen(period)}
                        >
                          <LockOpen className="size-3.5" aria-hidden="true" /> Reopen
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isCurrent}
                          loading={busy === period.id}
                          onClick={() => void close(period)}
                        >
                          <Lock className="size-3.5" aria-hidden="true" /> Close
                        </Button>
                      )}
                    </Can>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
