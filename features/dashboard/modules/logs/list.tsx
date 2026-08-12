"use client";

import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDateTime } from "../../lib/format";
import { exportToCsv } from "../../lib/export-csv";
import { toast } from "@/lib/toast";
import { EmptyState } from "../../components/state-views";
import type { AuditLogEntry } from "../../domain/types";
import { useRoleView } from "../../domain/use-domain";
import { useAuditLogs } from "./hooks";
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS } from "./types";

/**
 * Audit logs — the activity trail written by the domain services.
 *
 * Refund decisions, booking status changes, commission edits, settlement runs,
 * offer changes and account suspensions all land here automatically, with the
 * before → after values, so the record can't drift from what the system did.
 */
export function AuditLogsList() {
  const { isMerchant } = useRoleView();
  const list = useAuditLogs();
  const action = list.filters.action ?? "";
  const entity = list.filters.entity ?? "";

  const activeFilters: ActiveFilter[] = [
    action && {
      key: "action",
      label: `Action: ${AUDIT_ACTION_LABELS[action as AuditLogEntry["action"]] ?? action}`,
    },
    entity && { key: "entity", label: `Entity: ${entity.replace(/_/g, " ")}` },
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<AuditLogEntry>("audit-logs", list.rows, [
      { header: "When", value: (r) => formatDateTime(r.at) },
      { header: "Actor", value: (r) => r.actorName },
      { header: "Role", value: (r) => r.actorRole },
      { header: "Action", value: (r) => AUDIT_ACTION_LABELS[r.action] ?? r.action },
      { header: "Entity", value: (r) => r.entity },
      { header: "Entity label", value: (r) => r.entityLabel },
      { header: "Summary", value: (r) => r.summary },
      { header: "From", value: (r) => r.from ?? "" },
      { header: "To", value: (r) => r.to ?? "" },
      { header: "IP", value: (r) => r.ip ?? "" },
    ]);
    toast.success(`Exported ${list.rows.length} log entries`);
  };

  const ENTITY_OPTIONS = [
    "booking",
    "refund",
    "settlement",
    "offer",
    "combo_offer",
    "b2b_account",
    "b2b_invoice",
    "commission_rule",
    "session",
  ].map((value) => ({ value, label: value.replace(/_/g, " ") }));

  return (
    <ResourceListView<AuditLogEntry>
      list={list}
      searchPlaceholder="Search summary, actor or entity…"
      activeFilters={activeFilters}
      selectable={false}
      emptyState={
        isMerchant ? (
          <EmptyState
            title="Not available for merchant accounts"
            description="The platform audit trail records actions across every tenant, so it is restricted to platform roles."
          />
        ) : undefined
      }
      filterControls={
        <>
          <Select
            aria-label="Filter by action"
            value={action}
            onChange={(e) => list.setFilter("action", e.target.value)}
            options={[{ value: "", label: "All actions" }, ...AUDIT_ACTION_OPTIONS]}
            wrapperClassName="w-48"
          />
          <Select
            aria-label="Filter by entity"
            value={entity}
            onChange={(e) => list.setFilter("entity", e.target.value)}
            options={[{ value: "", label: "All entities" }, ...ENTITY_OPTIONS]}
            wrapperClassName="w-44"
          />
        </>
      }
      primaryAction={
        <Can anyPermission={["logs:export", "logs:read"]}>
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
      caption="Audit logs"
    />
  );
}
