"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Alert, Button, Drawer, DropdownItem, Select, StatCard } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { getErrorMessage } from "../../data";
import { toast } from "@/lib/toast";
import { PLATFORM_NOW } from "../../domain/money";
import { useRoleView } from "../../domain/use-domain";
import { useDeleteOffer, useOffers, useUpdateOffer } from "./hooks";
import { OfferForm } from "./offer-form";
import {
  OFFER_STATUSES,
  OFFER_TYPE_OPTIONS,
  type Offer,
  type OfferStatus,
} from "./types";

const statusLabel = labelMap(OFFER_STATUSES);

/**
 * Offer management.
 *
 * Admins manage platform offers; merchants manage offers on their own products
 * and see (read-only) the platform offers that apply to their inventory. Pause /
 * activate is a one-click status change so a campaign can be stopped without
 * editing it.
 */
export function OffersList() {
  const { isMerchant } = useRoleView();
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const del = useDeleteOffer();
  const update = useUpdateOffer();

  const canEdit = (offer: Offer) => !isMerchant || offer.scope === "merchant";

  const setStatus = async (offer: Offer, status: OfferStatus) => {
    try {
      await update.mutateAsync({ id: offer.id, input: { status } });
      toast.success(`"${offer.name}" is now ${statusLabel[status].toLowerCase()}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const list = useOffers((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={canEdit(row) ? () => setEditing(row) : undefined}
      onDelete={canEdit(row) ? () => setDeleting(row) : undefined}
      editPermission={["promotions:update"]}
      deletePermission={["promotions:delete"]}
      extra={
        canEdit(row) ? (
          <>
            {row.status !== "active" && (
              <DropdownItem onSelect={() => void setStatus(row, "active")}>
                Activate
              </DropdownItem>
            )}
            {row.status === "active" && (
              <DropdownItem onSelect={() => void setStatus(row, "paused")}>
                Pause
              </DropdownItem>
            )}
          </>
        ) : null
      }
    />
  ));

  const { status = "", offerType = "" } = list.filters;
  const activeFilters: ActiveFilter[] = [
    status && { key: "status", label: `Status: ${statusLabel[status as OfferStatus]}` },
    offerType && { key: "offerType", label: `Type: ${offerType.replace(/_/g, " ")}` },
  ].filter(Boolean) as ActiveFilter[];

  const active = list.rows.filter((o) => o.status === "active").length;
  const totalUses = list.rows.reduce((n, o) => n + o.used, 0);
  // Measured against the domain clock (never `Date.now()`) so the figure is
  // stable between server and client renders.
  const now = new Date(PLATFORM_NOW).getTime();
  const expiringSoon = list.rows.filter(
    (o) => o.status === "active" && new Date(o.endAt).getTime() - now < 7 * 86_400_000,
  ).length;

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(`Offer "${deleting.name}" deleted`);
      setDeleting(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active offers" icon="BadgePercent" value={active} hint="On this page" />
        <StatCard label="Redemptions" icon="TicketCheck" value={totalUses} />
        <StatCard
          label="Expiring within 7 days"
          icon="Clock"
          value={expiringSoon}
          hint="Consider extending or replacing"
        />
      </div>

      {isMerchant && (
        <Alert tone="info" title="Platform offers are read-only">
          Offers marked <strong>Platform</strong> are run by Otithee and already apply to
          your inventory. You can create, edit and pause your own merchant offers.
        </Alert>
      )}

      <ResourceListView<Offer>
        list={list}
        searchPlaceholder="Search offer name, code or description…"
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
              aria-label="Filter by type"
              value={offerType}
              onChange={(e) => list.setFilter("offerType", e.target.value)}
              options={[{ value: "", label: "All types" }, ...OFFER_TYPE_OPTIONS]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["promotions:create"]}>
            <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
              New offer
            </Button>
          </Can>
        }
        onRowClick={(row) => (canEdit(row) ? setEditing(row) : undefined)}
        caption="Offers"
      />

      <Drawer
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="Create offer"
      >
        <OfferForm onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Drawer>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing ? `Edit "${editing.name}"` : "Edit offer"}
      >
        {editing && (
          <OfferForm
            initial={editing}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete offer?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will be
            removed. Bookings that already used it keep their discount.
          </>
        }
        confirmLabel="Delete offer"
      />
    </div>
  );
}
