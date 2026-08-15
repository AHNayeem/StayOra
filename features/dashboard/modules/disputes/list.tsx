"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileUp, Gavel, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  DISPUTE_REASON_LABELS,
  DISPUTE_REASON_VALUES,
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_TONES,
  DISPUTE_STATUS_VALUES,
  daysToRespond,
  type Dispute,
  type DisputeStatus,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { ResourceListView, RowActions } from "../../crud";
import { Alert, Button, Modal, Select, StatCard, StatCardSkeleton, StatusBadge, Tag } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { useRoleView } from "../../domain/use-domain";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "../../lib/format";
import { exportToCsv } from "../../lib/export-csv";
import { ReasonDialog } from "../merchants/review-dialogs";
import {
  useAcceptDisputeLiability,
  useDecideDispute,
  useDisputeSummary,
  useDisputes,
  useRespondToDispute,
} from "./hooks";

const statusLabel = DISPUTE_STATUS_LABELS;
const reasonLabel = DISPUTE_REASON_LABELS;

const statusSelectOptions = DISPUTE_STATUS_VALUES.map((v) => ({ value: v, label: statusLabel[v] }));
const reasonSelectOptions = DISPUTE_REASON_VALUES.map((v) => ({ value: v, label: reasonLabel[v] }));

/**
 * Disputes — the same case list for both sides, with different moves.
 *
 * A merchant sees only disputes against their own bookings and can respond or
 * concede; the platform decides the outcome. Which actions appear is derived
 * from the domain's transition table, not from a role check in a button.
 */
export function DisputesList() {
  const { isMerchant } = useRoleView();
  const summary = useDisputeSummary();
  const respond = useRespondToDispute();
  const accept = useAcceptDisputeLiability();
  const decide = useDecideDispute();

  const [responding, setResponding] = useState<Dispute | null>(null);
  const [conceding, setConceding] = useState<Dispute | null>(null);
  const [deciding, setDeciding] = useState<{ row: Dispute; to: DisputeStatus } | null>(null);
  const [viewing, setViewing] = useState<Dispute | null>(null);

  const list = useDisputes((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      onView={() => setViewing(row)}
      extra={
        <>
          {isMerchant && row.status === "needs_response" && (
            <>
              <DropdownItem icon={<FileUp />} onSelect={() => setResponding(row)}>
                Respond with evidence
              </DropdownItem>
              <DropdownItem icon={<XCircle />} onSelect={() => setConceding(row)}>
                Accept liability
              </DropdownItem>
            </>
          )}
          {!isMerchant && (
            <Can anyPermission={["finance:update"]}>
              {(row.status === "needs_response" || row.status === "merchant_responded") && (
                <DropdownItem
                  icon={<Gavel />}
                  onSelect={() =>
                    void decide
                      .mutateAsync({ id: row.id, to: "under_review" })
                      .then(() => toast.success("Sent to the issuer"))
                      .catch((e) =>
                        toast.error("Couldn't update", { description: getErrorMessage(e) }),
                      )
                  }
                >
                  Send for review
                </DropdownItem>
              )}
              {(row.status === "under_review" ||
                row.status === "merchant_responded" ||
                row.status === "needs_response") && (
                <>
                  <DropdownItem
                    icon={<CheckCircle2 />}
                    onSelect={() => setDeciding({ row, to: "won" })}
                  >
                    Mark won
                  </DropdownItem>
                  <DropdownItem
                    icon={<XCircle />}
                    onSelect={() => setDeciding({ row, to: "lost" })}
                  >
                    Mark lost
                  </DropdownItem>
                </>
              )}
            </Can>
          )}
        </>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const reason = list.filters.reason ?? "";
  const activeFilters: ActiveFilter[] = [
    status ? { key: "status", label: `Status: ${statusLabel[status as DisputeStatus]}` } : null,
    reason
      ? { key: "reason", label: `Reason: ${reasonLabel[reason as Dispute["reason"]]}` }
      : null,
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<Dispute>("disputes", list.rows, [
      { header: "Case", value: (r) => r.reference },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Merchant", value: (r) => r.merchantName },
      { header: "Customer", value: (r) => r.customerName },
      { header: "Reason", value: (r) => reasonLabel[r.reason] },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Opened", value: (r) => formatDate(r.openedAt) },
      { header: "Respond by", value: (r) => formatDate(r.dueAt) },
    ]);
  };

  const s = summary.data;
  const urgent = list.rows.filter(
    (r) => r.status === "needs_response" && daysToRespond(r) <= 3,
  ).length;

  return (
    <div className="space-y-5">
      {isMerchant && urgent > 0 && (
        <Alert tone="danger" title="Respond soon">
          {urgent} {urgent === 1 ? "dispute closes" : "disputes close"} within three days. A case
          with no response is decided without your side of it.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading || !s ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Needs response"
              value={String(s.needsResponse)}
              icon="Gavel"
              hint={isMerchant ? "Waiting on you" : "Waiting on merchants"}
            />
            <StatCard label="Under review" value={String(s.underReview)} icon="CircleAlert" />
            <StatCard
              label="Amount at risk"
              value={formatCurrency(s.atRisk, s.currency)}
              icon="CircleDollarSign"
            />
            <StatCard
              label="Win rate"
              value={formatPercent(s.wonRate)}
              icon="CircleCheck"
              hint="Of decided cases"
            />
          </>
        )}
      </div>

      <ResourceListView<Dispute>
        list={list}
        searchPlaceholder="Search case, booking, merchant or customer…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[{ value: "", label: "All statuses" }, ...statusSelectOptions]}
              wrapperClassName="w-48"
            />
            <Select
              aria-label="Filter by reason"
              value={reason}
              onChange={(e) => list.setFilter("reason", e.target.value)}
              options={[{ value: "", label: "All reasons" }, ...reasonSelectOptions]}
              wrapperClassName="w-44"
            />
          </>
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
        caption="Disputes"
      />

      {/* Merchant: respond. The note is the case, so it is validated. */}
      <ReasonDialog
        open={Boolean(responding)}
        title={responding ? `Respond to ${responding.reference}` : "Respond"}
        description={responding?.claim}
        confirmLabel="Submit response"
        minLength={20}
        loading={respond.isPending}
        onClose={() => setResponding(null)}
        onConfirm={async (note) => {
          if (!responding) return;
          try {
            await respond.mutateAsync({
              id: responding.id,
              response: note,
              evidence: [
                {
                  label: "Booking confirmation",
                  fileName: `${responding.bookingRef}-confirmation.pdf`,
                },
              ],
            });
            toast.success("Response submitted", { description: `Case ${responding.reference}` });
            setResponding(null);
          } catch (error) {
            toast.error("Couldn't submit", { description: getErrorMessage(error) });
          }
        }}
      />

      <ReasonDialog
        open={Boolean(conceding)}
        title={conceding ? `Accept liability on ${conceding.reference}` : "Accept liability"}
        description="The chargeback stands and the amount is deducted from your settlement."
        confirmLabel="Accept liability"
        loading={accept.isPending}
        onClose={() => setConceding(null)}
        onConfirm={async (note) => {
          if (!conceding) return;
          try {
            await accept.mutateAsync({ id: conceding.id, note });
            toast.success("Liability accepted");
            setConceding(null);
          } catch (error) {
            toast.error("Couldn't update", { description: getErrorMessage(error) });
          }
        }}
      />

      <ReasonDialog
        open={Boolean(deciding)}
        title={
          deciding
            ? `Mark ${deciding.row.reference} as ${statusLabel[deciding.to].toLowerCase()}`
            : "Decision"
        }
        description="Recorded on the case and sent to the merchant."
        confirmLabel="Record decision"
        loading={decide.isPending}
        onClose={() => setDeciding(null)}
        onConfirm={async (note) => {
          if (!deciding) return;
          try {
            await decide.mutateAsync({ id: deciding.row.id, to: deciding.to, note });
            toast.success(`Case marked ${statusLabel[deciding.to].toLowerCase()}`);
            setDeciding(null);
          } catch (error) {
            toast.error("Couldn't record", { description: getErrorMessage(error) });
          }
        }}
      />

      <DisputeDetail dispute={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function DisputeDetail({ dispute, onClose }: { dispute: Dispute | null; onClose: () => void }) {
  if (!dispute) return null;
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={dispute.reference}
      description={`Booking ${dispute.bookingRef} · ${formatCurrency(dispute.amount, dispute.currency)}`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={DISPUTE_STATUS_TONES[dispute.status]}>
            {statusLabel[dispute.status]}
          </StatusBadge>
          <Tag variant="soft">{reasonLabel[dispute.reason]}</Tag>
          <span className="text-xs text-muted">
            Opened {formatDate(dispute.openedAt)} · respond by {formatDate(dispute.dueAt)}
          </span>
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">The claim</h3>
          <p className="mt-1 text-sm text-body">{dispute.claim}</p>
        </section>

        {dispute.merchantResponse && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Merchant response
            </h3>
            <p className="mt-1 text-sm text-body">{dispute.merchantResponse}</p>
          </section>
        )}

        {dispute.evidence.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Evidence</h3>
            <ul className="mt-1 space-y-1">
              {dispute.evidence.map((item) => (
                <li key={item.id} className="text-sm text-body">
                  · {item.label} — <span className="font-mono text-xs">{item.fileName}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Evidence is metadata only in this prototype — no file is stored or transmitted.
            </p>
          </section>
        )}

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">History</h3>
          <ol className="relative mt-2 space-y-4 border-l border-line pl-5">
            {[...dispute.timeline].reverse().map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute left-[-1.4rem] top-1 size-2.5 rounded-full bg-primary ring-4 ring-surface" />
                <p className="text-sm font-medium text-ink">{event.label}</p>
                <p className="text-xs text-muted">
                  {event.actor} · {formatDateTime(event.at)}
                </p>
                {event.note && <p className="mt-1 text-xs text-body">{event.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  );
}
