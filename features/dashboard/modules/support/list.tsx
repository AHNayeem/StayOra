"use client";

import { CheckCircle2, Download, RotateCcw } from "lucide-react";
import { toast } from "@/lib/toast";
import { ResourceListView, RowActions } from "../../crud";
import { Button, DropdownItem, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDateTime } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useTickets, useUpdateTicket } from "./hooks";
import { TICKET_STATUSES, type Ticket } from "./types";

const statusLabel = labelMap(TICKET_STATUSES);

/** Support queue — tickets with status facet, per-row transitions and export. */
export function SupportList() {
  const update = useUpdateTicket();

  const setStatus = async (row: Ticket, status: Ticket["status"]) => {
    await update.mutateAsync({ id: row.id, input: { status } });
    toast.saved(`Ticket ${row.reference}`);
  };

  const list = useTickets((row) => {
    const isDone = row.status === "resolved" || row.status === "closed";
    return (
      <RowActions
        label={`Actions for ${row.reference}`}
        extra={
          <Can anyPermission={["support:update"]}>
            {isDone ? (
              <DropdownItem
                icon={<RotateCcw />}
                onSelect={() => void setStatus(row, "open")}
              >
                Reopen ticket
              </DropdownItem>
            ) : (
              <DropdownItem
                icon={<CheckCircle2 />}
                onSelect={() => void setStatus(row, "resolved")}
              >
                Mark resolved
              </DropdownItem>
            )}
          </Can>
        }
      />
    );
  });

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Ticket["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<Ticket>("support-tickets", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Subject", value: (r) => r.subject },
      { header: "Requester", value: (r) => r.requester },
      { header: "Priority", value: (r) => r.priority },
      { header: "Assignee", value: (r) => r.assignee },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Updated", value: (r) => formatDateTime(r.updatedAt) },
    ]);
  };

  return (
    <ResourceListView<Ticket>
      list={list}
      searchPlaceholder="Search reference, subject or requester…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(TICKET_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can anyPermission={["support:export"]}>
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
      caption="Support tickets"
    />
  );
}
