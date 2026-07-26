"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useBookings, useDeleteBooking } from "./hooks";
import { BookingForm } from "./create-form";
import { BOOKING_STATUSES, type Booking } from "./types";

const statusLabel = labelMap(BOOKING_STATUSES);

/**
 * Bookings list — the reference list screen. Wires {@link useBookings} into the
 * shared {@link ResourceListView}: server-side search/sort/pagination, a status
 * facet filter, row → detail navigation, per-row view/edit/delete, bulk delete
 * and an RBAC-gated create action.
 */
export function BookingsList() {
  const router = useRouter();
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const del = useDeleteBooking();

  const list = useBookings((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      onView={() => router.push(`/dashboard/bookings/${row.id}`)}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["bookings:update"]}
      deletePermission={["bookings:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Booking["status"]]}` }]
    : [];

  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) await del.mutateAsync(id);
    list.clearSelection();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<Booking>
        list={list}
        searchPlaceholder="Search reference, guest or property…"
        activeFilters={activeFilters}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(BOOKING_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["bookings:create"]}>
            <Link
              href="/dashboard/bookings/create"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              New booking
            </Link>
          </Can>
        }
        bulkActions={(ids) => (
          <Can anyPermission={["bookings:delete"]}>
            <Button
              variant="danger"
              size="sm"
              loading={del.isPending}
              onClick={() => handleBulkDelete(ids)}
            >
              Delete {ids.length}
            </Button>
          </Can>
        )}
        onRowClick={(row) => router.push(`/dashboard/bookings/${row.id}`)}
        caption="Bookings"
      />

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing ? `Edit ${editing.reference}` : "Edit booking"}
      >
        {editing && (
          <BookingForm
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
        title="Delete booking?"
        message={
          <>
            Booking{" "}
            <strong className="font-semibold text-ink">{deleting?.reference}</strong>{" "}
            will be permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete booking"
      />
    </>
  );
}
