"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, RefreshCw, X } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  getState,
  resolveSupplierConfirmation,
  runJob,
  supplierService,
  type SupplierConfirmation,
} from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { Alert, Button, StatCard, StatusBadge } from "../../ui";
import { EmptyState } from "../../components/state-views";
import { Can } from "../../rbac/permission-guard";
import { formatDateTime } from "../../lib/format";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";

const TONE: Record<SupplierConfirmation["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "danger",
};

/**
 * Supplier confirmations — the acknowledgement between "paid" and "confirmed".
 *
 * On-request products (venue hire, visas, some tours) are not sold on live
 * allotment: the supplier has to accept. This screen is where they do it, and
 * where the platform can see what is still waiting. Anything left too long is
 * decided by the `supplier:confirm` job, so a request never hangs forever.
 */
export function SupplierConfirmationsView() {
  const actor = useDomainActor();
  const scope = useDomainScope();
  const [running, setRunning] = useState(false);

  const rows = useDomainValue(() => {
    const all = supplierService.all();
    return scope.merchantId ? all.filter((c) => c.merchantId === scope.merchantId) : all;
  }, [scope.merchantId]) ?? [];

  const bookings = useDomainValue(() => getState().bookings, []) ?? [];
  const bookingFor = (id: string) => bookings.find((b) => b.id === id);

  const pending = rows.filter((row) => row.status === "pending");

  const sweep = () => {
    setRunning(true);
    const run = runJob("supplier:confirm", { actor, manual: true });
    toast.success("Supplier queue processed", { description: run.summary });
    setRunning(false);
  };

  const decide = (row: SupplierConfirmation, status: "confirmed" | "rejected") => {
    resolveSupplierConfirmation(row.bookingId, status, {
      reason: status === "rejected" ? "Declined by the supplier." : undefined,
    });
    toast.success(status === "confirmed" ? "Booking confirmed" : "Booking declined", {
      description:
        status === "confirmed"
          ? "The traveller has been sent their confirmation."
          : "Finance has been notified to refund the customer in full.",
    });
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Requests" value={String(rows.length)} icon="ClipboardList" />
        <StatCard label="Awaiting supplier" value={String(pending.length)} icon="Clock" />
        <StatCard
          label="Confirmed"
          value={String(rows.filter((r) => r.status === "confirmed").length)}
          icon="CircleCheck"
        />
        <StatCard
          label="Declined"
          value={String(rows.filter((r) => r.status === "rejected").length)}
          icon="CircleAlert"
        />
      </div>

      <Alert tone="info" title="Why this step exists" className="mb-4">
        Instant-confirmation products are acknowledged the moment they are booked and get a
        supplier reference. On-request products wait here until the supplier accepts —
        confirming a booking the supplier never agreed to is where disputes come from.
      </Alert>

      <div className="mb-4 flex justify-end">
        <Can anyPermission={["bookings:update"]}>
          <Button size="sm" variant="outline" loading={running} onClick={sweep}>
            <RefreshCw className="size-4" aria-hidden="true" /> Process overdue requests
          </Button>
        </Can>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No supplier requests"
          description="Requests appear here when a booking is taken on a product that needs supplier confirmation."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">Supplier confirmations</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Supplier ref</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const booking = bookingFor(row.bookingId);
                return (
                  <tr key={row.bookingId} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/bookings/${row.bookingId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.bookingRef}
                      </Link>
                      <p className="text-xs text-muted">{booking?.customer.name}</p>
                    </td>
                    <td className="px-4 py-3 text-body">{booking?.productTitle ?? "—"}</td>
                    <td className="px-4 py-3 text-body">{formatDateTime(row.requestedAt)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-body">
                      {row.supplierRef ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={TONE[row.status]}>{row.status}</StatusBadge>
                      {row.reason && <p className="mt-1 text-xs text-muted">{row.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Can anyPermission={["bookings:update"]}>
                        {row.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => decide(row, "confirmed")}>
                              <Check className="size-3.5" aria-hidden="true" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => decide(row, "rejected")}
                            >
                              <X className="size-3.5" aria-hidden="true" /> Decline
                            </Button>
                          </div>
                        )}
                      </Can>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
