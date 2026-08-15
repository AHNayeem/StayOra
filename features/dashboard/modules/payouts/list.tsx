"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  PauseCircle,
  PlayCircle,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  PAYOUT_STATUS_LABELS,
  SETTLEMENT_STATUS_VALUES,
  SETTLEMENT_TRANSITIONS,
  type Payout,
  type PayoutStatus,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { ResourceListView, RowActions } from "../../crud";
import { Alert, Button, DropdownItem, Select, StatCard, StatCardSkeleton } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { useRoleView } from "../../domain/use-domain";
import { formatCurrency, formatDate } from "../../lib/format";
import { exportToCsv } from "../../lib/export-csv";
import { ReasonDialog } from "../merchants/review-dialogs";
import { useAdvancePayout, usePayoutSummary, usePayouts } from "./hooks";

const statusLabel = PAYOUT_STATUS_LABELS;
const statusSelectOptions = SETTLEMENT_STATUS_VALUES.map((v) => ({
  value: v,
  label: statusLabel[v],
}));

/**
 * Payouts — the settlement queue as finance works it: approve, hold, release,
 * mark paid or failed.
 *
 * Every move is validated against the *settlement* transition table and applied
 * to the settlement itself, so this screen and Settlements are two views of one
 * record rather than two competing ledgers. A merchant sees their own payouts
 * read-only, with the schedule and destination their onboarding set up.
 */
export function PayoutsList() {
  const { isMerchant } = useRoleView();
  const advance = useAdvancePayout();
  const summary = usePayoutSummary();
  const [holding, setHolding] = useState<Payout | null>(null);

  const move = async (row: Payout, to: PayoutStatus, label: string, note?: string) => {
    if (!SETTLEMENT_TRANSITIONS[row.status].includes(to)) {
      toast.error("Not allowed", {
        description: `A ${statusLabel[row.status].toLowerCase()} payout can't move to ${statusLabel[to].toLowerCase()}.`,
      });
      return;
    }
    try {
      await advance.mutateAsync({ id: row.id, to, note });
      toast.success(label, { description: row.reference });
    } catch (error) {
      toast.error("Couldn't update the payout", { description: getErrorMessage(error) });
    }
  };

  const list = usePayouts((row) =>
    isMerchant ? null : (
      <RowActions
        label={`Actions for ${row.reference}`}
        extra={
          <Can anyPermission={["finance:update", "finance:approve"]}>
            {row.status === "pending" && (
              <DropdownItem
                icon={<CalendarClock />}
                onSelect={() => move(row, "scheduled", "Payout approved")}
              >
                Approve &amp; schedule
              </DropdownItem>
            )}
            {row.status === "scheduled" && (
              <DropdownItem
                icon={<Send />}
                onSelect={() => move(row, "processing", "Payout released")}
              >
                Release
              </DropdownItem>
            )}
            {row.status === "processing" && (
              <>
                <DropdownItem
                  icon={<CheckCircle2 />}
                  onSelect={() => move(row, "paid", "Payout marked paid")}
                >
                  Mark paid
                </DropdownItem>
                <DropdownItem
                  icon={<XCircle />}
                  onSelect={() => move(row, "failed", "Payout marked failed")}
                >
                  Mark failed
                </DropdownItem>
              </>
            )}
            {row.status === "failed" && (
              <DropdownItem
                icon={<PlayCircle />}
                onSelect={() => move(row, "processing", "Payout retried")}
              >
                Retry
              </DropdownItem>
            )}
            {SETTLEMENT_TRANSITIONS[row.status].includes("on_hold") && (
              <DropdownItem icon={<PauseCircle />} onSelect={() => setHolding(row)}>
                Put on hold
              </DropdownItem>
            )}
            {row.status === "on_hold" && (
              <DropdownItem
                icon={<PlayCircle />}
                onSelect={() => move(row, "scheduled", "Payout released from hold")}
              >
                Release hold
              </DropdownItem>
            )}
          </Can>
        }
      />
    ),
  );

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as PayoutStatus]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Payout>("payouts", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Merchant", value: (r) => r.merchantName },
      { header: "Period", value: (r) => `${formatDate(r.periodStart)} – ${formatDate(r.periodEnd)}` },
      { header: "Destination", value: (r) => r.destination },
      { header: "Method", value: (r) => r.method },
      { header: "Schedule", value: (r) => r.scheduleLabel },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Scheduled for", value: (r) => formatDate(r.scheduledFor) },
    ]);
  };

  const s = summary.data;

  return (
    <div className="space-y-5">
      {!isMerchant && s && s.blocked > 0 && (
        <Alert tone="warning" title="Blocked by unverified payout accounts">
          {s.blocked} {s.blocked === 1 ? "payout" : "payouts"} worth{" "}
          {formatCurrency(s.blockedAmount, s.currency)} can&apos;t be released until the merchant&apos;s
          bank details are verified.{" "}
          <Link href="/dashboard/merchants" className="font-medium underline">
            Review merchants
          </Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading || !s ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Awaiting approval"
              value={formatCurrency(s.pendingAmount, s.currency)}
              icon="Clock"
              hint={`${s.pending} payouts`}
            />
            <StatCard
              label="Scheduled"
              value={formatCurrency(s.scheduledAmount, s.currency)}
              icon="CalendarClock"
              hint={`${s.scheduled} payouts`}
            />
            <StatCard
              label="On hold"
              value={formatCurrency(s.onHoldAmount, s.currency)}
              icon="PauseCircle"
            />
            <StatCard
              label="Paid"
              value={formatCurrency(s.paidAmount, s.currency)}
              icon="CircleCheck"
            />
          </>
        )}
      </div>

      <ResourceListView<Payout>
        list={list}
        searchPlaceholder="Search reference, merchant or account…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusSelectOptions]}
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

      <ReasonDialog
        open={Boolean(holding)}
        title={holding ? `Hold ${holding.reference}` : "Hold payout"}
        description="Recorded on the settlement so the reason survives after the hold is lifted."
        confirmLabel="Put on hold"
        loading={advance.isPending}
        onClose={() => setHolding(null)}
        onConfirm={async (note) => {
          if (!holding) return;
          await move(holding, "on_hold", "Payout put on hold", note);
          setHolding(null);
        }}
      />
    </div>
  );
}
