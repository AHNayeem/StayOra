"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import { Button, Select, StatCard, buttonVariants } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { BOOKING_STATUSES } from "../../domain/lifecycle";
import { B2B_ACCOUNTS } from "../../domain/seed";
import type { Booking, BookingStatus } from "../../domain/types";
import { useBookings } from "../bookings/hooks";
import { useB2BSummary } from "./hooks";

const statusLabel = labelMap(BOOKING_STATUSES);

const ACCOUNT_OPTIONS = B2B_ACCOUNTS.map((a) => ({ value: a.id, label: a.name }));

/**
 * B2B bookings — the same booking ledger, filtered to the B2B segment.
 *
 * Deliberately *not* a separate data set: a B2B booking is a booking with a
 * different pricing build-up and payment arrangement, so it shares the lifecycle,
 * the commission engine and the refund rules. The extra columns here are the ones
 * only B2B has — the account and its markup.
 */
export function B2BBookingsList() {
  const router = useRouter();
  const summary = useB2BSummary();

  // Pinned to the B2B segment via the list engine's initial filters, so the
  // service — not the table — does the filtering.
  const list = useBookings(
    (row) => (
      <RowActions
        label={`Actions for ${row.reference}`}
        onView={() => router.push(`/dashboard/bookings/${row.id}`)}
        viewPermission={["bookings:read"]}
      />
    ),
    { segment: "b2b" },
  );

  const { status = "", organizationId = "" } = list.filters;
  const activeFilters: ActiveFilter[] = [
    { key: "segment", label: "Segment: B2B" },
    status && { key: "status", label: `Status: ${statusLabel[status as BookingStatus]}` },
    organizationId && {
      key: "organizationId",
      label: `Account: ${B2B_ACCOUNTS.find((a) => a.id === organizationId)?.name ?? organizationId}`,
    },
  ].filter(Boolean) as ActiveFilter[];

  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="B2B bookings"
          icon="Handshake"
          value={s ? formatNumber(s.bookings) : "—"}
        />
        <StatCard
          label="Net rate value"
          icon="Landmark"
          value={s ? formatCurrency(s.netValue, s.currency) : "—"}
          hint="What agencies are charged"
        />
        <StatCard
          label="Agency markup"
          icon="TrendingUp"
          value={s ? formatCurrency(s.markup, s.currency) : "—"}
          hint="Partner margin on resale"
        />
      </div>

      <ResourceListView<Booking>
        list={list}
        searchPlaceholder="Search reference, traveller, product or account…"
        activeFilters={activeFilters}
        selectable={false}
        onRemoveFilter={(key) => {
          // The segment chip is structural for this screen — never removable.
          if (key !== "segment") list.setFilter(key, "");
        }}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(BOOKING_STATUSES),
              ]}
              wrapperClassName="w-48"
            />
            <Select
              aria-label="Filter by account"
              value={organizationId}
              onChange={(e) => list.setFilter("organizationId", e.target.value)}
              options={[{ value: "", label: "All accounts" }, ...ACCOUNT_OPTIONS]}
              wrapperClassName="w-56"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["bookings:create"]}>
            <Link href="/dashboard/bookings/create" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" aria-hidden="true" />
              New B2B booking
            </Link>
          </Can>
        }
        onRowClick={(row) => router.push(`/dashboard/bookings/${row.id}`)}
        caption="B2B bookings"
      />

      <p className="text-sm text-muted">
        B2B bookings share the platform booking lifecycle, commission engine and refund
        rules — only the pricing build-up and the payment arrangement differ.{" "}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/bookings")}
          className="px-1"
        >
          View all bookings
        </Button>
      </p>
    </div>
  );
}
