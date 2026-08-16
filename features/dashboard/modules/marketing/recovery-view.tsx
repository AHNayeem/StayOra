"use client";

import { useState } from "react";
import { BellRing, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  recoveryService,
  runJob,
  type RecoveryLead,
} from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { Alert, Button, StatCard, StatusBadge } from "../../ui";
import { EmptyState } from "../../components/state-views";
import { Can } from "../../rbac/permission-guard";
import { formatCurrency, formatDateTime } from "../../lib/format";
import { useDomainActor } from "../../domain/use-domain";

const TONE: Record<RecoveryLead["status"], "success" | "warning" | "neutral"> = {
  recovered: "success",
  open: "warning",
  expired: "neutral",
};

/**
 * Abandoned checkouts — the demand the platform already earned and lost.
 *
 * Every row is a real hold: a traveller who picked a room, chose dates and left
 * before paying. The recovery job writes to them with a link back to the same
 * selection; a lead closes itself when a matching booking appears, so the
 * recovery rate here is measured, not estimated.
 */
export function RecoveryView() {
  const actor = useDomainActor();
  const [running, setRunning] = useState(false);
  const leads = useDomainValue(() => recoveryService.list(), []) ?? [];
  const stats = useDomainValue(() => recoveryService.stats(), []) ?? {
    total: 0,
    open: 0,
    recovered: 0,
    expired: 0,
    openValue: 0,
    recoveredValue: 0,
    rate: 0,
  };

  const sweep = () => {
    setRunning(true);
    const run = runJob("abandoned:recover", { actor, manual: true });
    toast.success("Recovery sweep complete", { description: run.summary });
    setRunning(false);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open leads" value={String(stats.open)} icon="ShoppingCart" />
        <StatCard
          label="Value at risk"
          value={formatCurrency(stats.openValue, "USD")}
          icon="CircleDollarSign"
        />
        <StatCard label="Recovered" value={String(stats.recovered)} icon="CircleCheck" />
        <StatCard label="Recovery rate" value={`${stats.rate}%`} icon="TrendingUp" />
      </div>

      <Alert tone="info" title="Where these come from" className="mb-4">
        A hold is taken when a traveller reaches the payment step. If it lapses without a
        booking, the checkout is abandoned and lands here — with the room, the dates and the
        price they were quoted.
      </Alert>

      <div className="mb-4 flex justify-end">
        <Can anyPermission={["promotions:update"]}>
          <Button size="sm" variant="outline" loading={running} onClick={sweep}>
            <RefreshCw className="size-4" aria-hidden="true" /> Run recovery now
          </Button>
        </Can>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="No abandoned checkouts"
          description="When a traveller leaves a booking unpaid, the lead appears here with a link back to their dates."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[48rem] text-sm">
            <caption className="sr-only">Abandoned checkouts</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Traveller</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Nudged</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{lead.customerName}</p>
                    <p className="text-xs text-muted">{lead.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-body">{lead.listingTitle}</td>
                  <td className="px-4 py-3 text-body">
                    {lead.checkIn} → {lead.checkOut}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {formatCurrency(lead.value, lead.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={TONE[lead.status]}>
                      {lead.status === "open"
                        ? "Open"
                        : lead.status === "recovered"
                          ? "Recovered"
                          : "Expired"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-body">
                    {lead.nudgedAt ? formatDateTime(lead.nudgedAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Can anyPermission={["promotions:update"]}>
                      {lead.status === "open" && !lead.nudgedAt && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            recoveryService.nudge(lead.id);
                            toast.success("Nudge sent", {
                              description: `${lead.customerEmail} · simulated delivery`,
                            });
                          }}
                        >
                          <BellRing className="size-3.5" aria-hidden="true" /> Nudge
                        </Button>
                      )}
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
