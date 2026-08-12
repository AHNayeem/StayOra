"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import {
  Alert,
  Badge,
  Button,
  DropdownItem,
  Drawer,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  buttonVariants,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import { labelMap, statusOptions, toneMap } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { getErrorMessage } from "../../data";
import { toast } from "@/lib/toast";
import { REFUND_STATUSES, REFUND_TRANSITIONS } from "../../domain/lifecycle";
import type { Refund, RefundStatus } from "../../domain/types";
import { useRoleView } from "../../domain/use-domain";
import { useRefundDecision, useRefundSummary, useRefunds } from "./hooks";
import { REFUND_KIND_LABELS, REFUND_REASON_LABELS, REFUND_REASON_OPTIONS } from "./types";

const statusLabel = labelMap(REFUND_STATUSES);
const statusTone = toneMap(REFUND_STATUSES);

/** Human labels for the decision buttons, per target status. */
const DECISION_LABELS: Partial<Record<RefundStatus, string>> = {
  under_review: "Start review",
  approved: "Approve",
  rejected: "Reject",
  processing: "Send to provider",
  completed: "Mark refunded",
  failed: "Mark failed",
};

const DESTRUCTIVE: RefundStatus[] = ["rejected", "failed"];

/**
 * Refund console.
 *
 * Admin/finance drive the workflow here — review, approve, reject, process,
 * complete — and every decision is applied by the domain, which reverses the
 * commission and re-totals the merchant's settlement in the same transaction.
 * Merchants get the same list read-only: they can see refunds against their
 * products and what it costs them, but the decision is the platform's.
 */
export function RefundsList() {
  const { isMerchant } = useRoleView();
  const decide = useRefundDecision();
  const summary = useRefundSummary();

  const [selected, setSelected] = useState<Refund | null>(null);
  const [confirm, setConfirm] = useState<{ refund: Refund; to: RefundStatus } | null>(null);
  const [note, setNote] = useState("");

  const runDecision = async (refund: Refund, to: RefundStatus, decisionNote?: string) => {
    try {
      await decide.mutateAsync({ id: refund.id, to, note: decisionNote });
      toast.success(`${refund.reference} → ${statusLabel[to]}`, {
        description:
          to === "completed"
            ? `${formatCurrency(refund.refundAmount, refund.currency)} returned; commission reversed.`
            : undefined,
      });
      setConfirm(null);
      setNote("");
      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const list = useRefunds((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      onView={() => setSelected(row)}
      viewPermission={["finance:read"]}
      extra={
        isMerchant
          ? null
          : REFUND_TRANSITIONS[row.status].map((to) => (
              <DropdownItem
                key={to}
                danger={DESTRUCTIVE.includes(to)}
                disabled={decide.isPending}
                onSelect={() =>
                  DESTRUCTIVE.includes(to)
                    ? setConfirm({ refund: row, to })
                    : void runDecision(row, to)
                }
              >
                {DECISION_LABELS[to] ?? statusLabel[to]}
              </DropdownItem>
            ))
      }
    />
  ));

  const { status = "", reason = "" } = list.filters;
  const activeFilters: ActiveFilter[] = [
    status && { key: "status", label: `Status: ${statusLabel[status as RefundStatus]}` },
    reason && {
      key: "reason",
      label: `Reason: ${REFUND_REASON_LABELS[reason as Refund["reason"]]}`,
    },
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<Refund>("refunds", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Customer", value: (r) => r.customer.name },
      { header: "Merchant", value: (r) => r.merchant.name },
      { header: "Segment", value: (r) => r.segment.toUpperCase() },
      { header: "Reason", value: (r) => REFUND_REASON_LABELS[r.reason] },
      { header: "Kind", value: (r) => REFUND_KIND_LABELS[r.kind] },
      { header: "Booking total", value: (r) => formatCurrency(r.originalAmount, r.currency) },
      { header: "Cancellation fee", value: (r) => formatCurrency(r.cancellationFee, r.currency) },
      { header: "Tax adjustment", value: (r) => formatCurrency(r.taxAdjustment, r.currency) },
      { header: "Refund amount", value: (r) => formatCurrency(r.refundAmount, r.currency) },
      { header: "Commission reversed", value: (r) => formatCurrency(r.commissionReversed, r.currency) },
      { header: "Merchant deduction", value: (r) => formatCurrency(r.merchantDeduction, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Requested", value: (r) => formatDate(r.requestedAt) },
      { header: "Processed", value: (r) => (r.processedAt ? formatDate(r.processedAt) : "") },
    ]);
    toast.success(`Exported ${list.rows.length} refunds`);
  };

  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting decision"
          icon="Clock"
          value={s?.requested ?? "—"}
          hint={s ? `${formatCurrency(s.awaitingAmount, s.currency)} at stake` : undefined}
        />
        <StatCard label="In processing" icon="RefreshCw" value={s?.processing ?? "—"} />
        <StatCard
          label="Refunded to date"
          icon="BanknoteArrowDown"
          value={s ? formatCurrency(s.completedAmount, s.currency) : "—"}
        />
        <StatCard
          label="Rejected / failed"
          icon="CircleAlert"
          value={s ? s.rejected + s.failed : "—"}
          hint="Failed refunds need a manual payout"
        />
      </div>

      {isMerchant && (
        <Alert tone="info" title="Refund decisions are made by the platform">
          You can see every refund raised against your products and what it deducts
          from your settlement. Approving, rejecting and processing are platform
          actions, so the same policy applies to every merchant.
        </Alert>
      )}

      <ResourceListView<Refund>
        list={list}
        searchPlaceholder="Search refund, booking, customer or merchant…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(REFUND_STATUSES),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by reason"
              value={reason}
              onChange={(e) => list.setFilter("reason", e.target.value)}
              options={[{ value: "", label: "All reasons" }, ...REFUND_REASON_OPTIONS]}
              wrapperClassName="w-56"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["finance:export", "finance:read"]}>
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
        onRowClick={(row) => setSelected(row)}
        caption="Refunds"
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? `Refund ${selected.reference}` : "Refund"}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone[selected.status]}>
                {statusLabel[selected.status]}
              </StatusBadge>
              <Badge variant={selected.segment === "b2b" ? "accent" : "neutral"} size="sm">
                {selected.segment.toUpperCase()}
              </Badge>
              <Link
                href={`/dashboard/bookings/${selected.bookingId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {selected.bookingRef} →
              </Link>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Customer" value={selected.customer.name} />
              <Detail label="Merchant" value={selected.merchant.name} />
              <Detail label="Reason" value={REFUND_REASON_LABELS[selected.reason]} />
              <Detail label="Kind" value={REFUND_KIND_LABELS[selected.kind]} />
              <Detail label="Method" value={selected.method} />
              <Detail label="Requested" value={formatDateTime(selected.requestedAt)} />
              {selected.reviewedAt && (
                <Detail label="Reviewed" value={formatDateTime(selected.reviewedAt)} />
              )}
              {selected.processedAt && (
                <Detail label="Processed" value={formatDateTime(selected.processedAt)} />
              )}
              {selected.decidedBy && <Detail label="Decided by" value={selected.decidedBy} />}
            </dl>

            <div className="rounded-card border border-line p-4">
              <p className="text-sm font-semibold text-ink">Amounts</p>
              <dl className="mt-2 divide-y divide-line">
                <Amount label="Original booking total" value={selected.originalAmount} currency={selected.currency} />
                <Amount label="Cancellation fee" value={-selected.cancellationFee} currency={selected.currency} />
                <Amount label="Tax & fee adjustment" value={selected.taxAdjustment} currency={selected.currency} />
                <Amount label="Refund to customer" value={selected.refundAmount} currency={selected.currency} strong />
                <Amount label="Commission reversed" value={-selected.commissionReversed} currency={selected.currency} />
                <Amount label="Merchant deduction" value={-selected.merchantDeduction} currency={selected.currency} />
              </dl>
            </div>

            {selected.note && (
              <Alert tone="info" title="Request note">
                {selected.note}
              </Alert>
            )}
            {selected.decisionNote && (
              <Alert tone="warning" title="Decision note">
                {selected.decisionNote}
              </Alert>
            )}
            {selected.failureMessage && (
              <Alert tone="danger" title="Refund failed">
                {selected.failureMessage}
              </Alert>
            )}

            {!isMerchant && REFUND_TRANSITIONS[selected.status].length > 0 && (
              <div className="space-y-3 border-t border-line pt-4">
                <Textarea
                  label="Decision note"
                  rows={2}
                  placeholder="Recorded on the refund and in the audit log."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {REFUND_TRANSITIONS[selected.status].map((to) => (
                    <Button
                      key={to}
                      size="sm"
                      variant={DESTRUCTIVE.includes(to) ? "danger" : "primary"}
                      loading={decide.isPending}
                      onClick={() => void runDecision(selected, to, note || undefined)}
                    >
                      {DECISION_LABELS[to] ?? statusLabel[to]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {REFUND_TRANSITIONS[selected.status].length === 0 && (
              <p className="border-t border-line pt-4 text-sm text-muted">
                This refund has reached a final state.
              </p>
            )}

            <Link
              href={`/dashboard/bookings/${selected.bookingId}`}
              className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}
            >
              Open booking {selected.bookingRef}
            </Link>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm) await runDecision(confirm.refund, confirm.to, note || undefined);
        }}
        loading={decide.isPending}
        title={confirm?.to === "rejected" ? "Reject this refund?" : "Mark refund as failed?"}
        message={
          <>
            {confirm?.to === "rejected"
              ? "The customer will be told no refund is due. The booking status is unchanged."
              : "The provider could not return the money — finance will need to arrange a manual payout."}
            <span className="mt-2 block font-semibold text-ink">
              {confirm?.refund.reference} ·{" "}
              {confirm &&
                formatCurrency(confirm.refund.refundAmount, confirm.refund.currency)}
            </span>
          </>
        }
        confirmLabel={confirm?.to === "rejected" ? "Reject refund" : "Mark failed"}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Amount({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  const negative = value < 0;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
      </dt>
      <dd
        className={
          negative
            ? "text-sm font-medium tabular-nums text-danger"
            : strong
              ? "text-base font-bold tabular-nums text-ink"
              : "text-sm font-medium tabular-nums text-ink"
        }
      >
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(value), currency)}
      </dd>
    </div>
  );
}
