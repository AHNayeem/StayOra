import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { formatDuration, formatTime } from "@/lib/flight-time";
import { AirlineLogo } from "@/features/flights/airline-logo";
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
  type AdminPassenger,
  type AdminRoute,
  type AdminSchedule,
} from "./types";

/**
 * Column definitions for the six flight admin tables.
 *
 * Kept together so the flight domain reads consistently across every table:
 * airline codes always appear with their logo mark, routes always render as
 * `DAC → DXB`, and money is always right-aligned and tabular. A table where the
 * same field is formatted three different ways is a table nobody trusts.
 */

const airlineTone = toneMap(AIRLINE_STATUSES);
const airlineLabel = labelMap(AIRLINE_STATUSES);
const airportTone = toneMap(AIRPORT_STATUSES);
const airportLabelMap = labelMap(AIRPORT_STATUSES);
const routeTone = toneMap(ROUTE_STATUSES);
const routeLabel = labelMap(ROUTE_STATUSES);
const scheduleTone = toneMap(SCHEDULE_STATUSES);
const scheduleLabel = labelMap(SCHEDULE_STATUSES);
const bookingTone = toneMap(FLIGHT_BOOKING_STATUSES);
const bookingLabel = labelMap(FLIGHT_BOOKING_STATUSES);
const checkinTone = toneMap(CHECKIN_STATUSES);
const checkinLabel = labelMap(CHECKIN_STATUSES);
const refundTone = toneMap(REFUND_STATUSES);
const refundLabel = labelMap(REFUND_STATUSES);

/** Carrier cell — logo + code, used across every table that names an airline. */
function CarrierCell({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <AirlineLogo code={code} size="xs" />
      <span className="font-medium text-ink">{code}</span>
    </span>
  );
}

/* ------------------------------- Airlines --------------------------------- */

export const airlineColumns: ColumnDef<AdminAirline>[] = [
  {
    accessorKey: "name",
    header: "Airline",
    enableHiding: false,
    meta: { label: "Airline" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <AirlineLogo code={row.original.code} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.name}</p>
          <p className="truncate text-xs text-muted">
            {row.original.code} · {row.original.country}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "alliance",
    header: "Alliance",
    meta: { label: "Alliance" },
    cell: ({ row }) => (
      <span className="text-body">
        {row.original.alliance === "None" ? "—" : row.original.alliance}
      </span>
    ),
  },
  {
    accessorKey: "fleetSize",
    header: "Fleet",
    meta: { label: "Fleet", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.fleetSize)}</span>
    ),
  },
  {
    accessorKey: "onTimePct",
    header: "On time",
    meta: { label: "On time", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-body">{row.original.onTimePct}%</span>
    ),
  },
  {
    accessorKey: "commissionPct",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {row.original.commissionPct}%
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={airlineTone[row.original.status]}>
        {airlineLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];

/* ------------------------------- Airports --------------------------------- */

export const airportColumns: ColumnDef<AdminAirport>[] = [
  {
    accessorKey: "code",
    header: "Airport",
    enableHiding: false,
    meta: { label: "Airport" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">
          <span className="font-mono">{row.original.code}</span> · {row.original.city}
        </p>
        <p className="truncate text-xs text-muted">{row.original.name}</p>
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    meta: { label: "Country" },
    cell: ({ row }) => (
      <span className="text-body">
        {row.original.country}{" "}
        <span className="text-muted">({row.original.countryCode})</span>
      </span>
    ),
  },
  {
    accessorKey: "timezone",
    header: "Timezone",
    meta: { label: "Timezone" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-body">{row.original.timezone}</span>
    ),
  },
  {
    accessorKey: "terminals",
    header: "Terminals",
    meta: { label: "Terminals", align: "right" },
    cell: ({ row }) => <span className="tabular-nums">{row.original.terminals}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={airportTone[row.original.status]}>
        {airportLabelMap[row.original.status]}
      </StatusBadge>
    ),
  },
];

/* -------------------------------- Routes ---------------------------------- */

export const routeColumns: ColumnDef<AdminRoute>[] = [
  {
    accessorKey: "pair",
    header: "Route",
    enableHiding: false,
    meta: { label: "Route" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.pair}</p>
        <p className="truncate text-xs text-muted">
          {formatNumber(row.original.distanceKm)} km ·{" "}
          {formatDuration(row.original.durationMinutes)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "airlineCode",
    header: "Carrier",
    meta: { label: "Carrier" },
    cell: ({ row }) => <CarrierCell code={row.original.airlineCode} />,
  },
  {
    accessorKey: "weeklyFrequency",
    header: "Weekly",
    meta: { label: "Weekly flights", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.weeklyFrequency}×</span>
    ),
  },
  {
    accessorKey: "fromUsd",
    header: "From",
    meta: { label: "Lowest fare", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.fromUsd, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={routeTone[row.original.status]}>
        {routeLabel[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { label: "Updated" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.updatedAt)}
      </span>
    ),
  },
];

/* ------------------------------- Schedules -------------------------------- */

export const scheduleColumns: ColumnDef<AdminSchedule>[] = [
  {
    accessorKey: "flightNumber",
    header: "Flight",
    enableHiding: false,
    meta: { label: "Flight" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <AirlineLogo code={row.original.airlineCode} size="xs" />
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.original.flightNumber}</p>
          <p className="truncate text-xs text-muted">
            {row.original.originCode} → {row.original.destinationCode}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "departLocal",
    header: "Departs",
    meta: { label: "Departs" },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <p className="font-medium tabular-nums text-ink">
          {formatTime(row.original.departLocal)}
        </p>
        <p className="text-xs text-muted">
          {formatDate(`${row.original.departLocal.slice(0, 10)}T00:00:00.000Z`)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "arriveLocal",
    header: "Arrives",
    meta: { label: "Arrives" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums text-body">
        {formatTime(row.original.arriveLocal)}
      </span>
    ),
  },
  {
    accessorKey: "aircraft",
    header: "Aircraft",
    meta: { label: "Aircraft" },
    cell: ({ row }) => (
      <span className="truncate text-body">{row.original.aircraft}</span>
    ),
  },
  {
    accessorKey: "operatingDays",
    header: "Operates",
    meta: { label: "Operating days" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">{row.original.operatingDays}</span>
    ),
  },
  {
    id: "loadFactor",
    accessorFn: (row) => (row.seatsTotal > 0 ? row.seatsSold / row.seatsTotal : 0),
    header: "Load",
    meta: { label: "Load factor", align: "right" },
    cell: ({ row }) => {
      const { seatsSold, seatsTotal } = row.original;
      const pct = seatsTotal > 0 ? Math.round((seatsSold / seatsTotal) * 100) : 0;
      return (
        <span className="whitespace-nowrap">
          <span
            className={
              // A nearly-full flight is an upsell signal; a nearly-empty one is
              // a commercial problem. Both are worth spotting at a glance.
              pct >= 90
                ? "font-semibold tabular-nums text-danger"
                : pct >= 70
                  ? "font-medium tabular-nums text-ink"
                  : "tabular-nums text-muted"
            }
          >
            {pct}%
          </span>
          <span className="ml-1 text-xs text-muted">
            {seatsSold}/{seatsTotal}
          </span>
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={scheduleTone[row.original.status]}>
        {scheduleLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];

/* ------------------------------- Bookings --------------------------------- */

export const flightBookingColumns: ColumnDef<AdminFlightBooking>[] = [
  {
    accessorKey: "reference",
    header: "Reference",
    enableHiding: false,
    meta: { label: "Reference" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-mono font-medium text-ink">
          {row.original.reference}
        </p>
        <p className="truncate text-xs text-muted">PNR {row.original.pnr}</p>
      </div>
    ),
  },
  {
    accessorKey: "customer",
    header: "Customer",
    meta: { label: "Customer" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.customer}</p>
        <p className="truncate text-xs text-muted">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "route",
    header: "Route",
    meta: { label: "Route" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <AirlineLogo code={row.original.airlineCode} size="xs" />
        <div className="min-w-0">
          <p className="truncate text-body">{row.original.route}</p>
          <p className="truncate text-xs text-muted">
            {row.original.cabin} · {row.original.passengers} pax
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "departDate",
    header: "Departs",
    meta: { label: "Departs" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(`${row.original.departDate}T00:00:00.000Z`)}
      </span>
    ),
  },
  {
    accessorKey: "totalUsd",
    header: "Total",
    meta: { label: "Total", align: "right" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">
        {formatCurrency(row.original.totalUsd, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "commissionUsd",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-success">
        {formatCurrency(row.original.commissionUsd, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={bookingTone[row.original.status]}>
        {bookingLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];

/* ------------------------------ Passengers -------------------------------- */

export const passengerColumns: ColumnDef<AdminPassenger>[] = [
  {
    accessorKey: "fullName",
    header: "Passenger",
    enableHiding: false,
    meta: { label: "Passenger" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.fullName}</p>
        <p className="truncate text-xs text-muted">
          {row.original.type} · {row.original.nationality}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "bookingRef",
    header: "Booking",
    meta: { label: "Booking" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-mono text-xs text-ink">{row.original.bookingRef}</p>
        <p className="truncate text-xs text-muted">PNR {row.original.pnr}</p>
      </div>
    ),
  },
  {
    accessorKey: "flightNumber",
    header: "Flight",
    meta: { label: "Flight" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-body">{row.original.flightNumber}</p>
        <p className="truncate text-xs text-muted">{row.original.route}</p>
      </div>
    ),
  },
  {
    accessorKey: "documentNumber",
    header: "Document",
    meta: { label: "Travel document" },
    cell: ({ row }) => (
      <div className="min-w-0 whitespace-nowrap">
        <p className="font-mono text-xs text-ink">{row.original.documentNumber}</p>
        <p className="text-xs text-muted">
          exp {formatDate(`${row.original.documentExpiry}T00:00:00.000Z`)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "seat",
    header: "Seat",
    meta: { label: "Seat", align: "center" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums text-ink">{row.original.seat}</span>
    ),
  },
  {
    accessorKey: "ticketNumber",
    header: "Ticket",
    meta: { label: "Ticket number" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-mono text-xs text-muted">
        {row.original.ticketNumber}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Check-in",
    meta: { label: "Check-in" },
    cell: ({ row }) => (
      <StatusBadge tone={checkinTone[row.original.status]}>
        {checkinLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];

/* -------------------------------- Refunds --------------------------------- */

export const flightRefundColumns: ColumnDef<AdminFlightRefund>[] = [
  {
    accessorKey: "bookingRef",
    header: "Booking",
    enableHiding: false,
    meta: { label: "Booking" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-mono font-medium text-ink">
          {row.original.bookingRef}
        </p>
        <p className="truncate text-xs text-muted">{row.original.customer}</p>
      </div>
    ),
  },
  {
    accessorKey: "route",
    header: "Route",
    meta: { label: "Route" },
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <AirlineLogo code={row.original.airlineCode} size="xs" />
        <span className="truncate text-body">{row.original.route}</span>
      </div>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    meta: { label: "Reason" },
    cell: ({ row }) => (
      <span className="truncate text-body">{row.original.reason}</span>
    ),
  },
  {
    accessorKey: "paidUsd",
    header: "Paid",
    meta: { label: "Paid", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted">
        {formatCurrency(row.original.paidUsd, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "feeUsd",
    header: "Fee",
    meta: { label: "Cancellation fee", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-danger">
        −{formatCurrency(row.original.feeUsd, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "refundUsd",
    header: "Refund",
    meta: { label: "Refund due", align: "right" },
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-ink">
        {formatCurrency(row.original.refundUsd, "USD")}
      </span>
    ),
  },
  {
    accessorKey: "requestedAt",
    header: "Requested",
    meta: { label: "Requested" },
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-body">
        {formatDate(row.original.requestedAt)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={refundTone[row.original.status]}>
        {refundLabel[row.original.status]}
      </StatusBadge>
    ),
  },
];
