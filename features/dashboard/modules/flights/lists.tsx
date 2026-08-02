"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, DropdownItem, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { exportToCsv } from "../../lib/export-csv";
import { labelMap, statusOptions } from "../../lib/status";
import { formatDuration } from "@/lib/flight-time";
import {
  useAdminAirlines,
  useAdminAirports,
  useAdminFlightBookings,
  useAdminFlightRefunds,
  useAdminPassengers,
  useAdminRoutes,
  useAdminSchedules,
  useDeleteAirline,
  useDeleteAirport,
  useDeleteRoute,
  useDeleteSchedule,
  useUpdateFlightBookingStatus,
  useUpdateRefundStatus,
} from "./hooks";
import { AirlineForm, AirportForm, RouteForm, ScheduleForm } from "./forms";
import {
  AIRLINE_STATUSES,
  AIRPORT_STATUSES,
  CHECKIN_STATUSES,
  FLIGHT_BOOKING_STATUSES,
  REFUND_STATUSES,
  ROUTE_STATUSES,
  SCHEDULE_STATUSES,
  type AdminAirline,
  type AdminAirport,
  type AdminFlightBooking,
  type AdminFlightRefund,
  type AdminRoute,
  type AdminSchedule,
} from "./types";

/**
 * The six flight admin list views.
 *
 * All built on the shared {@link ResourceListView}, so they inherit search,
 * facet filtering, sorting, pagination, column visibility and CSV export from
 * the same engine as every other dashboard table — nothing about flights needed
 * a bespoke table.
 *
 * Every mutating control is wrapped in {@link Can}, so a user without
 * `flights:create`/`update`/`delete` sees a read-only table rather than buttons
 * that fail on click.
 */

/* ------------------------------- Airlines --------------------------------- */

const airlineStatusLabel = labelMap(AIRLINE_STATUSES);

export function AirlinesList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminAirline | null>(null);
  const [deleting, setDeleting] = useState<AdminAirline | null>(null);
  const del = useDeleteAirline();

  const list = useAdminAirlines((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["flights:update"]}
      deletePermission={["flights:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${airlineStatusLabel[status as AdminAirline["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <>
      <ResourceListView<AdminAirline>
        list={list}
        searchPlaceholder="Search airline, code or country…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(AIRLINE_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["flights:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" aria-hidden="true" />}
                disabled={list.rows.length === 0}
                onClick={() =>
                  exportToCsv("airlines", list.rows, [
                    { header: "Code", value: (r) => r.code },
                    { header: "Name", value: (r) => r.name },
                    { header: "Country", value: (r) => r.country },
                    { header: "Alliance", value: (r) => r.alliance },
                    { header: "Fleet", value: (r) => r.fleetSize },
                    { header: "On time %", value: (r) => r.onTimePct },
                    { header: "Commission %", value: (r) => r.commissionPct },
                    { header: "Status", value: (r) => airlineStatusLabel[r.status] },
                  ])
                }
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["flights:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add airline
              </Button>
            </Can>
          </div>
        }
        caption="Airlines"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit airline" : "New airline"}
      >
        {(creating || editing) && (
          <AirlineForm initial={editing ?? undefined} onDone={closeForm} onCancel={closeForm} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await del.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        loading={del.isPending}
        title="Remove airline?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will no
            longer appear in flight search results. Existing bookings are unaffected.
          </>
        }
        confirmLabel="Remove airline"
      />
    </>
  );
}

/* ------------------------------- Airports --------------------------------- */

const airportStatusLabel = labelMap(AIRPORT_STATUSES);

export function AirportsList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminAirport | null>(null);
  const [deleting, setDeleting] = useState<AdminAirport | null>(null);
  const del = useDeleteAirport();

  const list = useAdminAirports((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["flights:update"]}
      deletePermission={["flights:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${airportStatusLabel[status as AdminAirport["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <>
      <ResourceListView<AdminAirport>
        list={list}
        searchPlaceholder="Search airport, code or city…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(AIRPORT_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["flights:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" aria-hidden="true" />}
                disabled={list.rows.length === 0}
                onClick={() =>
                  exportToCsv("airports", list.rows, [
                    { header: "Code", value: (r) => r.code },
                    { header: "Name", value: (r) => r.name },
                    { header: "City", value: (r) => r.city },
                    { header: "Country", value: (r) => r.country },
                    { header: "Timezone", value: (r) => r.timezone },
                    { header: "Terminals", value: (r) => r.terminals },
                    { header: "Status", value: (r) => airportStatusLabel[r.status] },
                  ])
                }
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["flights:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add airport
              </Button>
            </Can>
          </div>
        }
        caption="Airports"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit airport" : "New airport"}
      >
        {(creating || editing) && (
          <AirportForm initial={editing ?? undefined} onDone={closeForm} onCancel={closeForm} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await del.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        loading={del.isPending}
        title="Remove airport?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will be
            removed from search and route definitions. This can&apos;t be undone.
          </>
        }
        confirmLabel="Remove airport"
      />
    </>
  );
}

/* -------------------------------- Routes ---------------------------------- */

const routeStatusLabel = labelMap(ROUTE_STATUSES);

export function RoutesList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminRoute | null>(null);
  const [deleting, setDeleting] = useState<AdminRoute | null>(null);
  const del = useDeleteRoute();

  const list = useAdminRoutes((row) => (
    <RowActions
      label={`Actions for ${row.pair}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["flights:update"]}
      deletePermission={["flights:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${routeStatusLabel[status as AdminRoute["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <>
      <ResourceListView<AdminRoute>
        list={list}
        searchPlaceholder="Search route or carrier…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(ROUTE_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["flights:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" aria-hidden="true" />}
                disabled={list.rows.length === 0}
                onClick={() =>
                  exportToCsv("routes", list.rows, [
                    { header: "Route", value: (r) => r.pair },
                    { header: "Carrier", value: (r) => r.airlineCode },
                    { header: "Distance (km)", value: (r) => r.distanceKm },
                    { header: "Block time", value: (r) => formatDuration(r.durationMinutes) },
                    { header: "Weekly flights", value: (r) => r.weeklyFrequency },
                    { header: "From (USD)", value: (r) => r.fromUsd },
                    { header: "Status", value: (r) => routeStatusLabel[r.status] },
                  ])
                }
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["flights:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add route
              </Button>
            </Can>
          </div>
        }
        caption="Routes"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit route" : "New route"}
      >
        {(creating || editing) && (
          <RouteForm initial={editing ?? undefined} onDone={closeForm} onCancel={closeForm} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await del.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        loading={del.isPending}
        title="Remove route?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.pair}</strong> on{" "}
            {deleting?.airlineCode} will stop being sold. Existing bookings are unaffected.
          </>
        }
        confirmLabel="Remove route"
      />
    </>
  );
}

/* ------------------------------- Schedules -------------------------------- */

const scheduleStatusLabel = labelMap(SCHEDULE_STATUSES);

export function SchedulesList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminSchedule | null>(null);
  const [deleting, setDeleting] = useState<AdminSchedule | null>(null);
  const del = useDeleteSchedule();

  const list = useAdminSchedules((row) => (
    <RowActions
      label={`Actions for ${row.flightNumber}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["flights:update"]}
      deletePermission={["flights:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${scheduleStatusLabel[status as AdminSchedule["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  return (
    <>
      <ResourceListView<AdminSchedule>
        list={list}
        searchPlaceholder="Search flight number or airport…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(SCHEDULE_STATUSES)]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["flights:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" aria-hidden="true" />}
                disabled={list.rows.length === 0}
                onClick={() =>
                  exportToCsv("schedules", list.rows, [
                    { header: "Flight", value: (r) => r.flightNumber },
                    { header: "Route", value: (r) => `${r.originCode} → ${r.destinationCode}` },
                    { header: "Departs", value: (r) => r.departLocal },
                    { header: "Arrives", value: (r) => r.arriveLocal },
                    { header: "Aircraft", value: (r) => r.aircraft },
                    { header: "Operating days", value: (r) => r.operatingDays },
                    { header: "Seats sold", value: (r) => r.seatsSold },
                    { header: "Seats total", value: (r) => r.seatsTotal },
                    { header: "Status", value: (r) => scheduleStatusLabel[r.status] },
                  ])
                }
              >
                Export
              </Button>
            </Can>
            <Can anyPermission={["flights:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Add schedule
              </Button>
            </Can>
          </div>
        }
        caption="Schedules"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit schedule" : "New schedule"}
      >
        {(creating || editing) && (
          <ScheduleForm initial={editing ?? undefined} onDone={closeForm} onCancel={closeForm} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await del.mutateAsync(deleting.id);
          setDeleting(null);
        }}
        loading={del.isPending}
        title="Remove schedule?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.flightNumber}</strong>{" "}
            will be removed from the timetable. Passengers already booked keep their
            reservations.
          </>
        }
        confirmLabel="Remove schedule"
      />
    </>
  );
}

/* ------------------------------- Bookings --------------------------------- */

const bookingStatusLabel = labelMap(FLIGHT_BOOKING_STATUSES);

export function FlightBookingsList() {
  const update = useUpdateFlightBookingStatus();

  const list = useAdminFlightBookings((row) => (
    <RowActions
      label={`Actions for ${row.reference}`}
      extra={
        <Can anyPermission={["flights:update"]}>
          {FLIGHT_BOOKING_STATUSES.filter((s) => s.value !== row.status).map((s) => (
            <DropdownItem
              key={s.value}
              onSelect={() => update.mutate({ id: row.id, status: s.value })}
            >
              Mark as {s.label.toLowerCase()}
            </DropdownItem>
          ))}
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [
        {
          key: "status",
          label: `Status: ${bookingStatusLabel[status as AdminFlightBooking["status"]]}`,
        },
      ]
    : [];

  return (
    <ResourceListView<AdminFlightBooking>
      list={list}
      searchPlaceholder="Search reference, PNR, customer or route…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions(FLIGHT_BOOKING_STATUSES),
          ]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can anyPermission={["flights:export"]}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="size-4" aria-hidden="true" />}
            disabled={list.rows.length === 0}
            onClick={() =>
              exportToCsv("flight-bookings", list.rows, [
                { header: "Reference", value: (r) => r.reference },
                { header: "PNR", value: (r) => r.pnr },
                { header: "Customer", value: (r) => r.customer },
                { header: "Email", value: (r) => r.email },
                { header: "Carrier", value: (r) => r.airlineCode },
                { header: "Route", value: (r) => r.route },
                { header: "Departs", value: (r) => r.departDate },
                { header: "Cabin", value: (r) => r.cabin },
                { header: "Passengers", value: (r) => r.passengers },
                { header: "Total (USD)", value: (r) => r.totalUsd },
                { header: "Commission (USD)", value: (r) => r.commissionUsd },
                { header: "Status", value: (r) => bookingStatusLabel[r.status] },
              ])
            }
          >
            Export
          </Button>
        </Can>
      }
      caption="Flight bookings"
    />
  );
}

/* ------------------------------ Passengers -------------------------------- */

const checkinStatusLabel = labelMap(CHECKIN_STATUSES);

export function PassengersList() {
  const list = useAdminPassengers();

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Check-in: ${checkinStatusLabel[status as keyof typeof checkinStatusLabel]}` }]
    : [];

  return (
    <ResourceListView
      list={list}
      searchPlaceholder="Search name, booking, PNR, document or ticket…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by check-in status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[
            { value: "", label: "All check-in states" },
            ...statusOptions(CHECKIN_STATUSES),
          ]}
          wrapperClassName="w-52"
        />
      }
      primaryAction={
        <Can anyPermission={["flights:export"]}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="size-4" aria-hidden="true" />}
            disabled={list.rows.length === 0}
            onClick={() =>
              exportToCsv("passengers", list.rows, [
                { header: "Name", value: (r) => r.fullName },
                { header: "Type", value: (r) => r.type },
                { header: "Booking", value: (r) => r.bookingRef },
                { header: "PNR", value: (r) => r.pnr },
                { header: "Nationality", value: (r) => r.nationality },
                { header: "Document", value: (r) => r.documentNumber },
                { header: "Document expiry", value: (r) => r.documentExpiry },
                { header: "Flight", value: (r) => r.flightNumber },
                { header: "Route", value: (r) => r.route },
                { header: "Seat", value: (r) => r.seat },
                { header: "Ticket", value: (r) => r.ticketNumber },
                { header: "Check-in", value: (r) => checkinStatusLabel[r.status] },
              ])
            }
          >
            Export
          </Button>
        </Can>
      }
      caption="Passengers"
    />
  );
}

/* -------------------------------- Refunds --------------------------------- */

const refundStatusLabel = labelMap(REFUND_STATUSES);

export function FlightRefundsList() {
  const update = useUpdateRefundStatus();

  const list = useAdminFlightRefunds((row) => (
    <RowActions
      label={`Actions for ${row.bookingRef}`}
      extra={
        <Can anyPermission={["flights:approve", "flights:update"]}>
          {REFUND_STATUSES.filter((s) => s.value !== row.status).map((s) => (
            <DropdownItem
              key={s.value}
              onSelect={() => update.mutate({ id: row.id, status: s.value })}
            >
              Mark as {s.label.toLowerCase()}
            </DropdownItem>
          ))}
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [
        {
          key: "status",
          label: `Status: ${refundStatusLabel[status as AdminFlightRefund["status"]]}`,
        },
      ]
    : [];

  return (
    <ResourceListView<AdminFlightRefund>
      list={list}
      searchPlaceholder="Search booking, customer or reason…"
      activeFilters={activeFilters}
      selectable={false}
      filterControls={
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => list.setFilter("status", e.target.value)}
          options={[{ value: "", label: "All statuses" }, ...statusOptions(REFUND_STATUSES)]}
          wrapperClassName="w-44"
        />
      }
      primaryAction={
        <Can anyPermission={["flights:export"]}>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="size-4" aria-hidden="true" />}
            disabled={list.rows.length === 0}
            onClick={() =>
              exportToCsv("flight-refunds", list.rows, [
                { header: "Booking", value: (r) => r.bookingRef },
                { header: "Customer", value: (r) => r.customer },
                { header: "Carrier", value: (r) => r.airlineCode },
                { header: "Route", value: (r) => r.route },
                { header: "Reason", value: (r) => r.reason },
                { header: "Paid (USD)", value: (r) => r.paidUsd },
                { header: "Fee (USD)", value: (r) => r.feeUsd },
                { header: "Refund (USD)", value: (r) => r.refundUsd },
                { header: "Requested", value: (r) => r.requestedAt },
                { header: "Status", value: (r) => refundStatusLabel[r.status] },
              ])
            }
          >
            Export
          </Button>
        </Can>
      }
      caption="Flight refund requests"
    />
  );
}
