"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  DropdownItem,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions, toneMap } from "../../lib/status";
import { getErrorMessage } from "../../data";
import { toast } from "@/lib/toast";
import { comboAvailability, comboTotals } from "../../domain/money";
import { getCancellationPolicy } from "../../domain/lifecycle";
import { DESTINATION_OPTIONS } from "../../domain/seed";
import { PRODUCT_KIND_LABELS } from "../bookings/types";
import { useCombos, useDeleteCombo, useUpdateCombo } from "./hooks";
import { ComboForm } from "./combo-form";
import { OFFER_STATUSES, type ComboOffer, type OfferStatus } from "./types";

const statusLabel = labelMap(OFFER_STATUSES);
const statusTone = toneMap(OFFER_STATUSES);

/**
 * Combo offers — bundles spanning several products and merchants.
 *
 * The list shows the economics that make a combo a combo (individual total,
 * bundle price, saving, availability), and the drawer breaks a bundle down item
 * by item with the pro-rata allocation each merchant is credited with.
 */
export function CombosList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ComboOffer | null>(null);
  const [viewing, setViewing] = useState<ComboOffer | null>(null);
  const [deleting, setDeleting] = useState<ComboOffer | null>(null);
  const del = useDeleteCombo();
  const update = useUpdateCombo();

  const setStatus = async (combo: ComboOffer, status: OfferStatus) => {
    try {
      await update.mutateAsync({ id: combo.id, input: { status } });
      toast.success(`"${combo.name}" is now ${statusLabel[status].toLowerCase()}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const list = useCombos((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onView={() => setViewing(row)}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      viewPermission={["promotions:read"]}
      editPermission={["promotions:update"]}
      deletePermission={["promotions:delete"]}
      extra={
        <>
          {row.status !== "active" && (
            <DropdownItem onSelect={() => void setStatus(row, "active")}>
              Publish
            </DropdownItem>
          )}
          {row.status === "active" && (
            <DropdownItem onSelect={() => void setStatus(row, "paused")}>
              Pause
            </DropdownItem>
          )}
        </>
      }
    />
  ));

  const { status = "", destination = "" } = list.filters;
  const activeFilters: ActiveFilter[] = [
    status && { key: "status", label: `Status: ${statusLabel[status as OfferStatus]}` },
    destination && { key: "destination", label: `Destination: ${destination}` },
  ].filter(Boolean) as ActiveFilter[];

  const totalSavings = list.rows.reduce((n, c) => n + comboTotals(c).savings, 0);
  const sold = list.rows.reduce((n, c) => n + c.sold, 0);
  const activeCount = list.rows.filter((c) => c.status === "active").length;

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(`Combo "${deleting.name}" deleted`);
      setDeleting(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const totals = viewing ? comboTotals(viewing) : null;
  const availability = viewing ? comboAvailability(viewing) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Live bundles" icon="PackagePlus" value={activeCount} />
        <StatCard label="Packages sold" icon="TicketCheck" value={sold} />
        <StatCard
          label="Advertised savings"
          icon="BadgePercent"
          value={formatCurrency(totalSavings, "USD")}
          hint="Total across bundles on this page"
        />
      </div>

      <ResourceListView<ComboOffer>
        list={list}
        searchPlaceholder="Search combo name, destination or description…"
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
                ...statusOptions(OFFER_STATUSES),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by destination"
              value={destination}
              onChange={(e) => list.setFilter("destination", e.target.value)}
              options={[
                { value: "", label: "All destinations" },
                ...DESTINATION_OPTIONS.map((d) => ({ value: d, label: d })),
              ]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["promotions:create"]}>
            <Button
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => setCreating(true)}
            >
              New combo
            </Button>
          </Can>
        }
        onRowClick={(row) => setViewing(row)}
        caption="Combo offers"
      />

      <Drawer open={creating} onClose={() => setCreating(false)} size="lg" title="Create combo offer">
        <ComboForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Drawer>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing ? `Edit "${editing.name}"` : "Edit combo"}
      >
        {editing && (
          <ComboForm
            initial={editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>

      <Drawer
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        size="lg"
        title={viewing?.name ?? "Combo"}
      >
        {viewing && totals && availability && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone[viewing.status]}>
                {statusLabel[viewing.status]}
              </StatusBadge>
              <Badge size="sm" variant="neutral">
                {viewing.destination}
              </Badge>
              <Badge size="sm" variant={availability.bookable ? "success" : "danger"}>
                {availability.bookable ? "Bookable" : (availability.reason ?? "Unavailable")}
              </Badge>
            </div>

            <p className="text-sm text-body">{viewing.description}</p>

            <Panel flush>
              <PanelHeader title="What's included" description="Individual prices vs the bundle" />
              <PanelBody className="pt-3">
                <ul className="divide-y divide-line">
                  {totals.allocation.map((item, index) => {
                    const source = viewing.items[index];
                    return (
                      <li key={item.itemId} className="flex flex-wrap items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                          <p className="truncate text-xs text-muted">
                            {PRODUCT_KIND_LABELS[source.kind]} · {source.merchantName}
                            {source.detail ? ` · ${source.detail}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm tabular-nums text-muted line-through">
                            {formatCurrency(item.price, "USD")}
                          </p>
                          <p className="text-sm font-medium tabular-nums text-ink">
                            {formatCurrency(item.allocated, "USD")}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <dl className="mt-4 space-y-1.5 border-t border-line pt-3">
                  <Line label="Individual total" value={totals.individualTotal} strike />
                  <Line label="Combo price" value={totals.comboPrice} strong />
                  <Line label="Customer saves" value={totals.savings} positive />
                </dl>
              </PanelBody>
            </Panel>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Validity"
                value={`${formatDate(viewing.validFrom)} → ${formatDate(viewing.validTo)}`}
              />
              <Detail
                label="Availability"
                value={`${totals.available} of ${viewing.inventory} packages left`}
              />
              <Detail
                label="Cancellation policy"
                value={getCancellationPolicy(viewing.cancellationPolicyId).label}
              />
              <Detail
                label="Refund handling"
                value={viewing.refundHandling.replace(/_/g, " ")}
              />
            </dl>

            {viewing.terms && (
              <Alert tone="info" title="Terms">
                {viewing.terms}
              </Alert>
            )}

            <div className="flex gap-2 border-t border-line pt-4">
              <Can anyPermission={["promotions:update"]}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(viewing);
                    setViewing(null);
                  }}
                >
                  Edit combo
                </Button>
              </Can>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete combo offer?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will be
            removed from sale. Existing bookings keep their bundle pricing.
          </>
        }
        confirmLabel="Delete combo"
      />
    </div>
  );
}

function Line({
  label,
  value,
  strong,
  strike,
  positive,
}: {
  label: string;
  value: number;
  strong?: boolean;
  strike?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
      </dt>
      <dd
        className={
          strike
            ? "text-sm tabular-nums text-muted line-through"
            : positive
              ? "text-sm font-bold tabular-nums text-success"
              : "text-base font-bold tabular-nums text-ink"
        }
      >
        {formatCurrency(value, "USD")}
      </dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm capitalize text-ink">{value}</dd>
    </div>
  );
}
