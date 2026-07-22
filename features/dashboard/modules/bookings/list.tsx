"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ResourceListView } from "../../crud";
import { Button, Select, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useBookings, useDeleteBooking } from "./hooks";
import { BOOKING_STATUSES, type Booking } from "./types";

const statusLabel = labelMap(BOOKING_STATUSES);

/**
 * Bookings list — the reference list screen. Wires {@link useBookings} into the
 * shared {@link ResourceListView}: server-side search/sort/pagination, a status
 * facet filter, row → detail navigation, bulk delete and an RBAC-gated create
 * action.
 */
export function BookingsList() {
  const router = useRouter();
  const list = useBookings();
  const del = useDeleteBooking();

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Booking["status"]]}` }]
    : [];

  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) await del.mutateAsync(id);
    list.clearSelection();
  };

  return (
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
        <Can permissions={["bookings:create"]}>
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
        <Can permissions={["bookings:delete"]}>
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
  );
}
