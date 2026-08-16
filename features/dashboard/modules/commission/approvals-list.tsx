"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, History, Undo2, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Panel,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  type ColumnDef,
} from "../../ui";
import { Modal } from "@/components/ui/modal";
import { Can } from "../../rbac/permission-guard";
import { useRbac } from "../../rbac/rbac-provider";
import { formatDateTime } from "../../lib/format";
import {
  CHANGE_REQUEST_STATUSES,
  CHANGE_REQUEST_STATUS_LABELS,
  CHANGE_REQUEST_STATUS_TONES,
  CHANGE_TYPE_LABELS,
  describeInput,
  type CommissionChangeRequest,
} from "../../domain/commission-approvals";
import {
  useApproveCommissionChange,
  useCancelCommissionChange,
  useCommissionChangeRequests,
  useRejectCommissionChange,
} from "./approvals-hooks";

/**
 * The commission approval queue.
 *
 * Every proposed rate change lands here with what it would replace, who asked,
 * why, and — once decided — who decided and on what grounds. Approving is the
 * only path by which a commission rule actually changes, so this screen is the
 * control the gap analysis said was missing rather than a report about one.
 */
export function CommissionApprovalsList() {
  const [status, setStatus] = useState("");
  const requests = useCommissionChangeRequests(status ? { status } : {});
  const approve = useApproveCommissionChange();
  const reject = useRejectCommissionChange();
  const cancel = useCancelCommissionChange();
  const { user } = useRbac();

  const [viewing, setViewing] = useState<CommissionChangeRequest | null>(null);
  const [rejecting, setRejecting] = useState<CommissionChangeRequest | null>(null);
  const [reason, setReason] = useState("");

  const rows = useMemo(() => requests.data ?? [], [requests.data]);
  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows],
  );

  const doApprove = async (row: CommissionChangeRequest) => {
    try {
      await approve.mutateAsync({ id: row.id });
      toast.success(`${row.reference} approved`, {
        description: "The rate book has been updated — new quotes use it immediately.",
      });
      setViewing(null);
    } catch (error) {
      toast.error("Couldn't approve", { description: getErrorMessage(error) });
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    try {
      await reject.mutateAsync({ id: rejecting.id, reason });
      toast.success(`${rejecting.reference} rejected`);
      setRejecting(null);
      setReason("");
      setViewing(null);
    } catch (error) {
      toast.error("Couldn't reject", { description: getErrorMessage(error) });
    }
  };

  const doCancel = async (row: CommissionChangeRequest) => {
    try {
      await cancel.mutateAsync({ id: row.id });
      toast.success(`${row.reference} withdrawn`);
      setViewing(null);
    } catch (error) {
      toast.error("Couldn't withdraw", { description: getErrorMessage(error) });
    }
  };

  const columns: ColumnDef<CommissionChangeRequest>[] = [
    {
      id: "reference",
      header: "Request",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.reference}</p>
          <p className="truncate text-xs text-muted">{CHANGE_TYPE_LABELS[row.type]}</p>
        </div>
      ),
    },
    {
      id: "rule",
      header: "Rule",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.ruleName}</p>
          <p className="truncate text-xs text-muted">{row.scopeLabel}</p>
        </div>
      ),
    },
    {
      id: "change",
      header: "Change",
      cell: (row) => <span className="text-sm text-body">{row.summary}</span>,
    },
    {
      id: "requested",
      header: "Requested",
      cell: (row) => (
        <div className="text-xs text-body">
          <p>{row.requestedByName}</p>
          <p className="text-muted">{formatDateTime(row.requestedAt)}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "w-40",
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={CHANGE_REQUEST_STATUS_TONES[row.status]}>
            {CHANGE_REQUEST_STATUS_LABELS[row.status]}
          </StatusBadge>
          {row.selfApproved && (
            <Badge size="sm" variant="outline">
              Self-approved
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "w-px",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewing(row)}>
            Review
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting approval" icon="Clock" value={counts.pending} />
        <StatCard label="Approved" icon="CircleCheck" value={counts.approved} />
        <StatCard label="Rejected" icon="CircleX" value={counts.rejected} />
      </div>

      <Alert tone="info" title="Why rate changes queue here">
        A commission rule decides what every future booking is charged, so changes are
        proposed rather than applied. Approving one writes it to the rate book; nothing
        else does.
      </Alert>

      <Panel flush>
        <PanelHeader
          title="Change requests"
          description="Proposed additions, rate changes and removals."
          actions={
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...CHANGE_REQUEST_STATUSES.map((s) => ({
                  value: s,
                  label: CHANGE_REQUEST_STATUS_LABELS[s],
                })),
              ]}
              wrapperClassName="w-48"
            />
          }
        />
        <DataTable<CommissionChangeRequest>
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={requests.isLoading}
          caption="Commission change requests"
          emptyState={
            <EmptyState
              title="Nothing to review"
              description="Rate changes proposed from the Commission rules screen appear here."
            />
          }
        />
      </Panel>

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing ? `${viewing.reference} — ${viewing.ruleName}` : "Request"}
      >
        {viewing && (
          <div className="flex flex-col gap-5 px-1 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={CHANGE_REQUEST_STATUS_TONES[viewing.status]}>
                {CHANGE_REQUEST_STATUS_LABELS[viewing.status]}
              </StatusBadge>
              <Badge size="sm" variant="accent">
                {CHANGE_TYPE_LABELS[viewing.type]}
              </Badge>
              <Badge size="sm" variant="neutral">
                {viewing.scopeLabel}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Today
                </p>
                <p className="mt-1 text-sm text-body">
                  {viewing.current ? describeInput(viewing.current) : "No rule yet"}
                </p>
              </div>
              <div className="rounded-card border border-primary/40 bg-primary-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Proposed
                </p>
                <p className="mt-1 text-sm text-body">
                  {viewing.proposed
                    ? describeInput(viewing.proposed)
                    : CHANGE_TYPE_LABELS[viewing.type]}
                </p>
              </div>
            </div>

            {viewing.note && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Requester&rsquo;s reason
                </p>
                <p className="mt-1 text-sm text-body">{viewing.note}</p>
              </div>
            )}

            {viewing.decisionNote && (
              <Alert
                tone={viewing.status === "rejected" ? "danger" : "info"}
                title={viewing.status === "rejected" ? "Rejected" : "Decision note"}
              >
                {viewing.decisionNote}
              </Alert>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                <History className="mr-1 inline size-3.5" aria-hidden="true" />
                History
              </p>
              <ol className="flex flex-col gap-2">
                {viewing.history.map((event, i) => (
                  <li
                    key={`${event.at}-${i}`}
                    className="flex gap-3 rounded-field border border-line px-3 py-2"
                  >
                    <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        <strong className="font-medium">{event.actorName}</strong>{" "}
                        {event.action}
                      </p>
                      <p className="text-xs text-muted">{formatDateTime(event.at)}</p>
                      {event.note && <p className="mt-1 text-sm text-body">{event.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {viewing.status === "pending" && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                {viewing.requestedById === user.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Undo2 className="size-4" />}
                    loading={cancel.isPending}
                    onClick={() => doCancel(viewing)}
                  >
                    Withdraw
                  </Button>
                )}
                <Can anyPermission={["finance:approve"]}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<XCircle className="size-4" />}
                    onClick={() => setRejecting(viewing)}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<CheckCircle2 className="size-4" />}
                    loading={approve.isPending}
                    onClick={() => doApprove(viewing)}
                  >
                    Approve &amp; apply
                  </Button>
                </Can>
              </div>
            )}

            {viewing.status === "pending" && viewing.requestedById === user.id && (
              <p className="text-xs text-muted">
                You raised this request. Approving your own change is recorded as
                self-approved.
              </p>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        size="md"
        title="Reject this change?"
        description="The requester sees this reason and can revise the proposal."
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Reason"
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Not mid-contract — several merchants have a fixed rate until renewal."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={reject.isPending}
              disabled={reason.trim().length < 4}
              onClick={doReject}
            >
              Reject request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
