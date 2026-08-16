"use client";

import { useState } from "react";
import { Download, Plus, Power, PowerOff } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useDeleteTax, useSetTaxStatus, useTaxes } from "./hooks";
import { TaxForm } from "./form";
import { TaxRuleCheck } from "./rule-check";
import {
  TAX_BASIS_LABELS,
  TAX_STATUSES,
  TAX_TYPES,
  isPercentageBasis,
  jurisdictionLabel,
  type TaxRule,
} from "./types";

const statusLabel = labelMap(TAX_STATUSES);
const typeLabel = labelMap(TAX_TYPES);

/** Tax rules — search, status facet, create/edit drawer, enable toggle, delete. */
export function TaxList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TaxRule | null>(null);
  const [deleting, setDeleting] = useState<TaxRule | null>(null);
  // Bumped after every mutation so the rule-check panel re-reads the rule book.
  const [revision, setRevision] = useState(0);
  const bump = () => setRevision((n) => n + 1);
  const del = useDeleteTax();
  const setStatus = useSetTaxStatus();

  const list = useTaxes((row) => {
    const active = row.status === "active";
    return (
      <RowActions
        label={`Actions for ${row.name}`}
        onEdit={() => setEditing(row)}
        onDelete={() => setDeleting(row)}
        editPermission={["finance:update"]}
        deletePermission={["finance:delete"]}
        extra={
          <Can anyPermission={["finance:update"]}>
            <DropdownItem
              icon={active ? <PowerOff /> : <Power />}
              onSelect={() =>
                void setStatus
                  .mutateAsync({
                    id: row.id,
                    status: active ? "inactive" : "active",
                  })
                  .then(bump)
              }
            >
              {active ? "Disable" : "Enable"}
            </DropdownItem>
          </Can>
        }
      />
    );
  });

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as TaxRule["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    bump();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
    bump();
  };

  const handleExport = () => {
    exportToCsv<TaxRule>("tax-rules", list.rows, [
      { header: "Rule", value: (r) => r.name },
      { header: "Jurisdiction", value: (r) => jurisdictionLabel(r.region) },
      { header: "Applies to", value: (r) => r.category },
      { header: "Charged on", value: (r) => TAX_BASIS_LABELS[r.basis] },
      {
        header: "Charge",
        value: (r) => (isPercentageBasis(r.basis) ? `${r.rate}%` : r.amount.toFixed(2)),
      },
      { header: "Type", value: (r) => typeLabel[r.type] },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Updated", value: (r) => formatDate(r.updatedAt) },
    ]);
  };

  return (
    <>
      <ResourceListView<TaxRule>
        list={list}
        searchPlaceholder="Search rule, region or category…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(TAX_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["finance:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" />}
                onClick={handleExport}
                disabled={list.rows.length === 0}
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["finance:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add tax rule
              </Button>
            </Can>
          </div>
        }
        caption="Tax rules"
      />

      <TaxRuleCheck revision={revision} />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit tax rule" : "New tax rule"}
      >
        {(creating || editing) && (
          <TaxForm
            initial={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete tax rule?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            be permanently removed. Bookings already taxed are unaffected. This can&apos;t
            be undone.
          </>
        }
        confirmLabel="Delete tax rule"
      />
    </>
  );
}
