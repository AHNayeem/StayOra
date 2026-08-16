"use client";

import { useState } from "react";
import { BellRing, RefreshCw, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { runJob, waitlistService, type WaitlistEntry } from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { Alert, Button, StatCard, StatusBadge } from "../../ui";
import { EmptyState } from "../../components/state-views";
import { Can } from "../../rbac/permission-guard";
import { formatDate, formatDateTime } from "../../lib/format";
import { useDomainActor } from "../../domain/use-domain";

const TONE: Record<WaitlistEntry["status"], "success" | "warning" | "info" | "neutral"> = {
  waiting: "warning",
  notified: "info",
  converted: "success",
  cancelled: "neutral",
  expired: "neutral",
};

/**
 * Waitlist — demand for dates that were sold out.
 *
 * This is the clearest signal a revenue manager gets: real travellers, real
 * dates, real room types, all of it recoverable. The sweep re-checks
 * availability and writes to whoever is waiting the moment a cancellation puts
 * units back, so the "notified" rows are ones the platform already acted on.
 */
export function WaitlistView() {
  const actor = useDomainActor();
  const [running, setRunning] = useState(false);
  const entries = useDomainValue(() => waitlistService.all(), []) ?? [];
  const stats = useDomainValue(() => waitlistService.stats(), []) ?? {
    total: 0,
    waiting: 0,
    notified: 0,
    converted: 0,
  };

  const sweep = () => {
    setRunning(true);
    const run = runJob("waitlist:notify", { actor, manual: true });
    toast.success("Waitlist checked", { description: run.summary });
    setRunning(false);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Requests" value={String(stats.total)} icon="ListChecks" />
        <StatCard label="Waiting" value={String(stats.waiting)} icon="Clock" />
        <StatCard label="Notified" value={String(stats.notified)} icon="BellRing" />
        <StatCard label="Converted" value={String(stats.converted)} icon="CircleCheck" />
      </div>

      <Alert tone="info" title="Sold out is not a dead end" className="mb-4">
        When a traveller&apos;s dates are unavailable, the listing page offers nearby dates
        and a waitlist. The <code className="font-mono text-xs">waitlist:notify</code> job
        re-checks availability and emails them the moment those dates come back.
      </Alert>

      <div className="mb-4 flex justify-end">
        <Can anyPermission={["catalog:update"]}>
          <Button size="sm" variant="outline" loading={running} onClick={sweep}>
            <RefreshCw className="size-4" aria-hidden="true" /> Check availability now
          </Button>
        </Can>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Nobody is waiting"
          description="Waitlist requests appear here when travellers ask to be told about sold-out dates."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">Waitlist requests</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Traveller</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{entry.customerName}</p>
                    <p className="text-xs text-muted">{entry.customerEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-body">{entry.listingTitle}</td>
                  <td className="px-4 py-3 text-body">
                    {entry.roomTypeName} × {entry.units}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {formatDate(`${entry.checkIn}T00:00:00.000Z`)} →{" "}
                    {formatDate(`${entry.checkOut}T00:00:00.000Z`)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={TONE[entry.status]}>{entry.status}</StatusBadge>
                    {entry.notifiedAt && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <BellRing className="size-3" aria-hidden="true" />
                        {formatDateTime(entry.notifiedAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body">{formatDate(entry.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Can anyPermission={["catalog:update"]}>
                      {(entry.status === "waiting" || entry.status === "notified") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            waitlistService.cancel(entry.id);
                            toast.success("Request closed");
                          }}
                        >
                          <X className="size-3.5" aria-hidden="true" /> Close
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
