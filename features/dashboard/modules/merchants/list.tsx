"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Ban, UserCog, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select, buttonVariants } from "../../ui";
import { DropdownItem, DropdownSeparator } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import {
  useDeleteMerchant,
  useMerchants,
  useSetMerchantStatus,
} from "./hooks";
import { MerchantForm } from "./create-form";
import { MERCHANT_STATUSES, type Merchant } from "./types";

const statusLabel = labelMap(MERCHANT_STATUSES);

/**
 * Merchants list — search, status facet, bulk approve/suspend, per-row
 * edit/approve/suspend/delete and an RBAC-gated invite.
 */
export function MerchantsList() {
  const router = useRouter();
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [deleting, setDeleting] = useState<Merchant | null>(null);
  const setStatus = useSetMerchantStatus();
  const del = useDeleteMerchant();

  const impersonate = (row: Merchant) =>
    toast.info("Impersonation session started", {
      description: `You're now viewing the platform as ${row.name} (demo).`,
    });

  const list = useMerchants((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onView={() => router.push(`/dashboard/merchants/${row.id}`)}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      viewPermission={["merchants:read"]}
      editPermission={["merchants:update"]}
      deletePermission={["merchants:delete"]}
      extra={
        <>
          <Can anyPermission={["merchants:approve"]}>
            {row.status !== "active" && (
              <DropdownItem
                icon={<CheckCircle2 />}
                onSelect={() =>
                  void setStatus.mutateAsync({ id: row.id, status: "active" })
                }
              >
                {row.status === "suspended" ? "Activate" : "Approve"}
              </DropdownItem>
            )}
            {row.status === "pending" && (
              <DropdownItem
                icon={<XCircle />}
                onSelect={() =>
                  void setStatus.mutateAsync({ id: row.id, status: "rejected" })
                }
              >
                Reject
              </DropdownItem>
            )}
            {row.status !== "suspended" && (
              <DropdownItem
                icon={<Ban />}
                onSelect={() =>
                  void setStatus.mutateAsync({ id: row.id, status: "suspended" })
                }
              >
                Suspend
              </DropdownItem>
            )}
          </Can>
          <Can anyPermission={["merchants:impersonate"]}>
            <DropdownItem icon={<UserCog />} onSelect={() => impersonate(row)}>
              Impersonate
            </DropdownItem>
          </Can>
          <DropdownSeparator />
        </>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Merchant["status"]]}` }]
    : [];

  const applyStatus = async (ids: string[], next: Merchant["status"]) => {
    for (const id of ids) await setStatus.mutateAsync({ id, status: next });
    list.clearSelection();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Merchant>
        list={list}
        searchPlaceholder="Search merchant, contact or country…"
        activeFilters={activeFilters}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(MERCHANT_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["merchants:create"]}>
            <Link
              href="/dashboard/merchants/create"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Invite merchant
            </Link>
          </Can>
        }
        bulkActions={(ids) => (
          <Can anyPermission={["merchants:approve"]}>
            <Button
              variant="outline"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => applyStatus(ids, "active")}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => applyStatus(ids, "suspended")}
            >
              Suspend
            </Button>
          </Can>
        )}
        caption="Merchants"
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing ? `Edit ${editing.name}` : "Edit merchant"}
      >
        {editing && (
          <MerchantForm
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
        title="Delete merchant?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> and
            their listings will be permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete merchant"
      />
    </>
  );
}
