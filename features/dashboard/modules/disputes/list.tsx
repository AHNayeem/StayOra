"use client";

import { CheckCircle2, Download, FileUp, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { ResourceListView, RowActions } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate, formatPercent } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useDisputes, useDisputeSummary, useSetDisputeStatus } from "./hooks";
import {
  DISPUTE_REASONS,
  DISPUTE_STATUSES,
  type Dispute,
} from "./types";

const statusLabel = labelMap(DISPUTE_STATUSES);
const reasonLabel = labelMap(DISPUTE_REASONS);

/** Disputes — chargeback KPIs, status/reason facets, evidence & outcome actions. */
export function DisputesList() {
  const summary = useDisputeSummary();
  const setStatus = useSetDisputeStatus();

  const advance = (row: Dispute, to: Dispute["status"], msg: string) =>
    void setStatus.mutateAsync({ id: row.id, status: to }).then(() =>
      toast.success(msg, { description: `Case ${row.reference}` }),
    );

  const list = useDisputes((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      extra={
        <Can anyPermission={["finance:update"]}>
          {row.status === "needs_response" && (
            <>
              <DropdownItem
                icon={<FileUp />}
                onSelect={() => advance(row, "under_review", "Evidence submitted")}
              >
                Submit evidence
              </DropdownItem>
              <DropdownItem
                icon={<XCircle />}
                onSelect={() => advance(row, "lost", "Liability accepted")}
              >
                Accept liability
              </DropdownItem>
            </>
          )}
          {row.status === "under_review" && (
            <>
              <DropdownItem
                icon={<CheckCircle2 />}
                onSelect={() => advance(row, "won", "Dispute marked won")}
              >
                Mark won
              </DropdownItem>
              <DropdownItem
                icon={<XCircle />}
                onSelect={() => advance(row, "lost", "Dispute marked lost")}
              >
                Mark lost
              </DropdownItem>
            </>
          )}
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const reason = list.filters.reason ?? "";
  const activeFilters: ActiveFilter[] = [
    status
      ? { key: "status", label: `Status: ${statusLabel[status as Dispute["status"]]}` }
      : null,
    reason
      ? { key: "reason", label: `Reason: ${reasonLabel[reason as Dispute["reason"]]}` }
      : null,
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<Dispute>("disputes", list.rows, [
      { header: "Case", value: (r) => r.reference },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Customer", value: (r) => r.customer },
      { header: "Reason", value: (r) => reasonLabel[r.reason] },
      { header: "Amount", value: (r) => formatCurrency(r.amount, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Opened", value: (r) => formatDate(r.openedAt) },
      { header: "Respond by", value: (r) => formatDate(r.dueAt) },
    ]);
  };

  const s = summary.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading || !s ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Needs response"
              value={String(s.open)}
              icon="Gavel"
              hint="Action required"
            />
            <StatCard
              label="Under review"
              value={String(s.underReview)}
              icon="CircleAlert"
            />
            <StatCard
              label="Amount at risk"
              value={formatCurrency(s.atRisk, s.currency)}
              icon="CircleDollarSign"
            />
            <StatCard
              label="Win rate"
              value={formatPercent(s.wonRate)}
              icon="CircleCheck"
              hint="Of resolved cases"
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
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(DISPUTE_STATUSES),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by reason"
              value={reason}
              onChange={(e) => list.setFilter("reason", e.target.value)}
              options={[
                { value: "", label: "All reasons" },
                ...statusOptions(DISPUTE_REASONS),
              ]}
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
    </div>
  );
}
