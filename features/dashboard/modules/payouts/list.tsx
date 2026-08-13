"use client";

import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  History,
  PauseCircle,
  PlayCircle,
  Send,
  XCircle,
} from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import { Button, DropdownItem, Modal, Select, Textarea } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { usePayouts, useUpdatePayout } from "./hooks";
import { PAYOUT_STATUSES, PAYOUT_TRANSITIONS, type Payout, type PayoutStatus } from "./types";
import { toast } from "@/lib/toast";

const statusLabel = labelMap(PAYOUT_STATUSES);

/**
 * Payouts — the merchant settlement queue with the decisions finance actually
 * makes: approve, hold, release, reject, mark paid or failed.
 *
 * Moves are validated against {@link PAYOUT_TRANSITIONS} rather than offered
 * blindly, and every one appends to the payout's timeline, so the reason a
 * payout is sitting where it is stays readable afterwards.
 */
export function PayoutsList() {
  const update = useUpdatePayout();
  const [timelineOf, setTimelineOf] = useState<Payout | null>(null);
  const [holding, setHolding] = useState<Payout | null>(null);

  const move = async (
    row: Payout,
    status: PayoutStatus,
    label: string,
    note?: string,
  ) => {
    if (!PAYOUT_TRANSITIONS[row.status].includes(status)) {
      toast.error("Not allowed", {
        description: `A ${statusLabel[row.status].toLowerCase()} payout can't move to ${statusLabel[status].toLowerCase()}.`,
      });
      return;
    }
    await update.mutateAsync({
      id: row.id,
      input: {
        status,
        holdReason: status === "on_hold" ? note : undefined,
        timeline: [
          ...row.timeline,
          { at: new Date().toISOString(), label, actor: "You", note },
        ],
      },
    });
    toast.success(`${row.reference} — ${label.toLowerCase()}`);
  };

  const list = usePayouts((row) => {
    const next = PAYOUT_TRANSITIONS[row.status];
    return (
      <RowActions
        label={`Actions for ${row.reference}`}
        extra={
          <>
            <DropdownItem icon={<History />} onSelect={() => setTimelineOf(row)}>
              View timeline
            </DropdownItem>
            <Can anyPermission={["finance:update"]}>
              {next.includes("scheduled") && (
                <DropdownItem
                  icon={row.status === "on_hold" ? <PlayCircle /> : <CheckCircle2 />}
                  onSelect={() =>
                    void move(
                      row,
                      "scheduled",
                      row.status === "on_hold" ? "Released from hold" : "Approved for payout",
                    )
                  }
                >
                  {row.status === "on_hold" ? "Release hold" : "Approve"}
                </DropdownItem>
              )}
              {next.includes("on_hold") && (
                <DropdownItem icon={<PauseCircle />} onSelect={() => setHolding(row)}>
                  Put on hold
                </DropdownItem>
              )}
              {next.includes("processing") && (
                <DropdownItem
                  icon={<Send />}
                  onSelect={() => void move(row, "processing", "Sent to the bank")}
                >
                  Send to bank
                </DropdownItem>
              )}
              {next.includes("paid") && (
                <DropdownItem
                  icon={<CheckCircle2 />}
                  onSelect={() => void move(row, "paid", "Paid to merchant")}
                >
                  Mark paid
                </DropdownItem>
              )}
              {next.includes("rejected") && (
                <DropdownItem
                  icon={<XCircle />}
                  danger
                  onSelect={() =>
                    void move(row, "rejected", "Rejected", "Rejected by finance review")
                  }
                >
                  Reject
                </DropdownItem>
              )}
            </Can>
          </>
        }
      />
    );
  });

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as PayoutStatus]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Payout>("payouts", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Method", value: (r) => r.method },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Hold reason", value: (r) => r.holdReason ?? "" },
      { header: "Date", value: (r) => formatDate(r.createdAt) },
    ]);
  };

  return (
    <>
      <ResourceListView<Payout>
        list={list}
        searchPlaceholder="Search reference or merchant…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(PAYOUT_STATUSES),
            ]}
            wrapperClassName="w-48"
          />
        }
        primaryAction={
          <Can permissions={["finance:export"]}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={handleExport}
              disabled={list.rows.length === 0}
            >
              Export CSV
            </Button>
          </Can>
        }
        caption="Payouts"
      />

      {timelineOf && (
        <Modal
          open
          onClose={() => setTimelineOf(null)}
          title={`Payout ${timelineOf.reference}`}
          description={`${timelineOf.merchant} · ${formatCurrency(timelineOf.amount, timelineOf.currency)}`}
          footer={
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setTimelineOf(null)}>
                Close
              </Button>
            </div>
          }
        >
          <ol className="space-y-4">
            {timelineOf.timeline.map((event, index) => (
              <li key={index} className="flex gap-3">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{event.label}</p>
                  {event.note && <p className="text-sm text-body">{event.note}</p>}
                  <p className="text-xs text-muted">
                    {formatDateTime(event.at)} · {event.actor}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {timelineOf.holdReason && (
            <p className="mt-4 flex items-start gap-2 rounded-field bg-warning/12 p-3 text-sm text-amber-800">
              <CalendarClock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Currently on hold: {timelineOf.holdReason}
            </p>
          )}
        </Modal>
      )}

      {holding && (
        <HoldDialog
          payout={holding}
          onClose={() => setHolding(null)}
          onConfirm={(reason) => {
            void move(holding, "on_hold", "Placed on hold", reason);
            setHolding(null);
          }}
        />
      )}
    </>
  );
}

function HoldDialog({
  payout,
  onClose,
  onConfirm,
}: {
  payout: Payout;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={`Hold payout ${payout.reference}`}
      description="The merchant sees that a payout is held, so say why in words they'd understand."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={reason.trim().length < 5}
            onClick={() => onConfirm(reason.trim())}
          >
            Put on hold
          </Button>
        </div>
      }
    >
      <Textarea
        label="Reason"
        rows={4}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Refund pending on a booking in this batch, bank details being re-verified…"
      />
    </Modal>
  );
}
