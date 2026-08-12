"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Plus, TriangleAlert } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import {
  Button,
  DropdownItem,
  Select,
  StatCard,
  buttonVariants,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import { BOOKING_STATUSES } from "../../domain/lifecycle";
import { availableBookingActions } from "../../domain/lifecycle";
import { useRbac } from "../../rbac/rbac-provider";
import { useRoleView } from "../../domain/use-domain";
import { useBookingCounts, useBookings, useBookingTransition } from "./hooks";
import {
  PRODUCT_KIND_LABELS,
  PRODUCT_KIND_OPTIONS,
  SEGMENT_LABELS,
  SEGMENT_OPTIONS,
  type Booking,
} from "./types";

const statusLabel = labelMap(BOOKING_STATUSES);

/**
 * Bookings list — the operations console.
 *
 * Beyond the shared list surface it adds lifecycle awareness: KPI tiles for the
 * states that need action, a "needs attention" facet, and per-row quick actions
 * generated from the state machine (so the menu can only ever offer transitions
 * the domain will accept, for permissions the user actually holds).
 */
export function BookingsList() {
  const router = useRouter();
  const { can } = useRbac();
  const { isMerchant, isAgency } = useRoleView();
  const transition = useBookingTransition();
  const counts = useBookingCounts();
  const [busyId, setBusyId] = useState<string | null>(null);

  const runAction = async (booking: Booking, actionId: string, label: string) => {
    setBusyId(booking.id);
    try {
      await transition.mutateAsync({
        id: booking.id,
        actionId: actionId as Parameters<typeof transition.mutateAsync>[0]["actionId"],
        failureReason: actionId === "mark_failed" ? "provider_rejected" : undefined,
      });
      toast.success(`${label} — ${booking.reference}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const list = useBookings((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      onView={() => router.push(`/dashboard/bookings/${row.id}`)}
      viewPermission={["bookings:read"]}
      extra={availableBookingActions(row, can).map((action) => (
        <DropdownItem
          key={action.id}
          disabled={busyId === row.id}
          onSelect={() => runAction(row, action.id, action.label)}
        >
          {action.label}
        </DropdownItem>
      ))}
    />
  ));

  const { status = "", segment = "", productKind = "", needsAttention = "" } = list.filters;

  const activeFilters: ActiveFilter[] = [
    status && { key: "status", label: `Status: ${statusLabel[status as Booking["status"]]}` },
    segment && { key: "segment", label: `Segment: ${SEGMENT_LABELS[segment as Booking["segment"]]}` },
    productKind && {
      key: "productKind",
      label: `Product: ${PRODUCT_KIND_LABELS[productKind as Booking["productKind"]]}`,
    },
    needsAttention && { key: "needsAttention", label: "Needs attention" },
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<Booking>("bookings", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Segment", value: (r) => SEGMENT_LABELS[r.segment] },
      { header: "Customer", value: (r) => r.customer.name },
      { header: "Organization", value: (r) => r.customer.organizationName ?? "" },
      { header: "Product", value: (r) => r.productTitle },
      { header: "Merchant", value: (r) => r.merchant.name },
      { header: "Travel date", value: (r) => formatDate(r.startAt) },
      { header: "Total", value: (r) => formatCurrency(r.money.total, r.money.currency) },
      { header: "Discount", value: (r) => formatCurrency(r.money.discount, r.money.currency) },
      { header: "Commission", value: (r) => formatCurrency(r.money.commission, r.money.currency) },
      { header: "Merchant earning", value: (r) => formatCurrency(r.money.merchantEarning, r.money.currency) },
      { header: "Booking status", value: (r) => statusLabel[r.status] },
      { header: "Payment status", value: (r) => r.payment.status },
    ]);
    toast.success(`Exported ${list.rows.length} bookings`);
  };

  const c = counts.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Needs attention"
          icon="TriangleAlert"
          value={c ? c.failed + c.cancellationRequested + c.refundPending + c.pending : "—"}
          hint="Failed, awaiting payment, cancellation or refund"
        />
        <StatCard
          label="Confirmed"
          icon="CircleCheck"
          value={c?.confirmed ?? "—"}
          hint="Delivered on the travel date"
        />
        <StatCard
          label="Failed bookings"
          icon="CircleAlert"
          value={c?.failed ?? "—"}
          hint="Never delivered — refund may be owed"
        />
        <StatCard
          label="Refunds pending"
          icon="BanknoteArrowDown"
          value={c?.refundPending ?? "—"}
          hint="Awaiting processing or retry"
        />
      </div>

      <ResourceListView<Booking>
        list={list}
        searchPlaceholder="Search reference, customer, product or invoice…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by booking status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(BOOKING_STATUSES),
              ]}
              wrapperClassName="w-48"
            />
            {!isAgency && (
              <Select
                aria-label="Filter by segment"
                value={segment}
                onChange={(e) => list.setFilter("segment", e.target.value)}
                options={[{ value: "", label: "B2C + B2B" }, ...SEGMENT_OPTIONS]}
                wrapperClassName="w-44"
              />
            )}
            <Select
              aria-label="Filter by product"
              value={productKind}
              onChange={(e) => list.setFilter("productKind", e.target.value)}
              options={[{ value: "", label: "All products" }, ...PRODUCT_KIND_OPTIONS]}
              wrapperClassName="w-40"
            />
            <Button
              variant={needsAttention ? "primary" : "outline"}
              size="sm"
              leftIcon={<TriangleAlert className="size-4" />}
              onClick={() => list.setFilter("needsAttention", needsAttention ? "" : "1")}
            >
              Needs attention
            </Button>
          </>
        }
        primaryAction={
          <>
            <Can anyPermission={["bookings:read"]}>
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
            <Can anyPermission={["bookings:create"]}>
              <Link
                href="/dashboard/bookings/create"
                className={buttonVariants({ size: "sm" })}
              >
                <Plus className="size-4" aria-hidden="true" />
                {isAgency ? "New B2B booking" : "New booking"}
              </Link>
            </Can>
          </>
        }
        onRowClick={(row) => router.push(`/dashboard/bookings/${row.id}`)}
        caption={
          isMerchant
            ? "Bookings for your properties"
            : isAgency
              ? "Bookings made by your organization"
              : "All platform bookings"
        }
      />
    </div>
  );
}
