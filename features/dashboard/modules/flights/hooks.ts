"use client";

import { type ReactNode } from "react";
import { useMutation } from "../../data";
import { useResourceList } from "../../crud";
import {
  airlineColumns,
  airportColumns,
  flightBookingColumns,
  flightRefundColumns,
  passengerColumns,
  routeColumns,
  scheduleColumns,
} from "./columns";
import {
  airlineKeys,
  airlineService,
  airportKeys,
  airportService,
  flightBookingKeys,
  flightBookingService,
  flightRefundKeys,
  flightRefundService,
  passengerKeys,
  passengerService,
  routeKeys,
  routeService,
  scheduleKeys,
  scheduleService,
} from "./service";
import type {
  AirlineFormValues,
  AirportFormValues,
  RouteFormValues,
  ScheduleFormValues,
} from "./schemas";
import type {
  AdminAirline,
  AdminAirport,
  AdminFlightBooking,
  AdminFlightRefund,
  AdminPassenger,
  AdminRoute,
  AdminSchedule,
} from "./types";

/**
 * List + mutation hooks for the flight admin modules.
 *
 * Each list hook wires the module's service, columns and default sort into the
 * shared {@link useResourceList}, so every flight table gets search, filtering,
 * sorting, pagination and column visibility from the same engine as the rest of
 * the dashboard.
 */

/* ------------------------------- Airlines --------------------------------- */

export function useAdminAirlines(rowActions?: (row: AdminAirline) => ReactNode) {
  return useResourceList<AdminAirline>({
    queryKey: airlineKeys.all,
    fetcher: (params, signal) => airlineService.list(params, signal),
    columns: airlineColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "name", direction: "asc" },
    rowActions,
  });
}

export function useCreateAirline() {
  return useMutation<AdminAirline, AirlineFormValues>({
    mutationFn: (input) => airlineService.create(input),
    invalidateKeys: [airlineKeys.all],
  });
}

export function useUpdateAirline() {
  return useMutation<AdminAirline, { id: string; input: AirlineFormValues }>({
    mutationFn: ({ id, input }) => airlineService.update(id, input),
    invalidateKeys: [airlineKeys.all],
  });
}

export function useDeleteAirline() {
  return useMutation<void, string>({
    mutationFn: (id) => airlineService.remove(id),
    invalidateKeys: [airlineKeys.all],
  });
}

/* ------------------------------- Airports --------------------------------- */

export function useAdminAirports(rowActions?: (row: AdminAirport) => ReactNode) {
  return useResourceList<AdminAirport>({
    queryKey: airportKeys.all,
    fetcher: (params, signal) => airportService.list(params, signal),
    columns: airportColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "code", direction: "asc" },
    rowActions,
  });
}

export function useCreateAirport() {
  return useMutation<AdminAirport, AirportFormValues>({
    mutationFn: (input) => airportService.create(input),
    invalidateKeys: [airportKeys.all],
  });
}

export function useUpdateAirport() {
  return useMutation<AdminAirport, { id: string; input: AirportFormValues }>({
    mutationFn: ({ id, input }) => airportService.update(id, input),
    invalidateKeys: [airportKeys.all],
  });
}

export function useDeleteAirport() {
  return useMutation<void, string>({
    mutationFn: (id) => airportService.remove(id),
    invalidateKeys: [airportKeys.all],
  });
}

/* -------------------------------- Routes ---------------------------------- */

export function useAdminRoutes(rowActions?: (row: AdminRoute) => ReactNode) {
  return useResourceList<AdminRoute>({
    queryKey: routeKeys.all,
    fetcher: (params, signal) => routeService.list(params, signal),
    columns: routeColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "pair", direction: "asc" },
    rowActions,
  });
}

export function useCreateRoute() {
  return useMutation<AdminRoute, RouteFormValues>({
    mutationFn: (input) => routeService.create(input),
    invalidateKeys: [routeKeys.all],
  });
}

export function useUpdateRoute() {
  return useMutation<AdminRoute, { id: string; input: RouteFormValues }>({
    mutationFn: ({ id, input }) => routeService.update(id, input),
    invalidateKeys: [routeKeys.all],
  });
}

export function useDeleteRoute() {
  return useMutation<void, string>({
    mutationFn: (id) => routeService.remove(id),
    invalidateKeys: [routeKeys.all],
  });
}

/* ------------------------------- Schedules -------------------------------- */

export function useAdminSchedules(rowActions?: (row: AdminSchedule) => ReactNode) {
  return useResourceList<AdminSchedule>({
    queryKey: scheduleKeys.all,
    fetcher: (params, signal) => scheduleService.list(params, signal),
    columns: scheduleColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "departLocal", direction: "asc" },
    rowActions,
  });
}

export function useCreateSchedule() {
  return useMutation<AdminSchedule, ScheduleFormValues>({
    mutationFn: (input) => scheduleService.create(input),
    invalidateKeys: [scheduleKeys.all],
  });
}

export function useUpdateSchedule() {
  return useMutation<AdminSchedule, { id: string; input: ScheduleFormValues }>({
    mutationFn: ({ id, input }) => scheduleService.update(id, input),
    invalidateKeys: [scheduleKeys.all],
  });
}

export function useDeleteSchedule() {
  return useMutation<void, string>({
    mutationFn: (id) => scheduleService.remove(id),
    invalidateKeys: [scheduleKeys.all],
  });
}

/* --------------------- Read-mostly operational resources ------------------ */

export function useAdminFlightBookings(
  rowActions?: (row: AdminFlightBooking) => ReactNode,
) {
  return useResourceList<AdminFlightBooking>({
    queryKey: flightBookingKeys.all,
    fetcher: (params, signal) => flightBookingService.list(params, signal),
    columns: flightBookingColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "bookedAt", direction: "desc" },
    rowActions,
  });
}

/** Update a booking's status (confirm, cancel, mark flown). */
export function useUpdateFlightBookingStatus() {
  return useMutation<
    AdminFlightBooking,
    { id: string; status: AdminFlightBooking["status"] }
  >({
    mutationFn: ({ id, status }) => flightBookingService.update(id, { status }),
    invalidateKeys: [flightBookingKeys.all],
  });
}

export function useAdminPassengers(rowActions?: (row: AdminPassenger) => ReactNode) {
  return useResourceList<AdminPassenger>({
    queryKey: passengerKeys.all,
    fetcher: (params, signal) => passengerService.list(params, signal),
    columns: passengerColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "fullName", direction: "asc" },
    rowActions,
  });
}

export function useAdminFlightRefunds(
  rowActions?: (row: AdminFlightRefund) => ReactNode,
) {
  return useResourceList<AdminFlightRefund>({
    queryKey: flightRefundKeys.all,
    fetcher: (params, signal) => flightRefundService.list(params, signal),
    columns: flightRefundColumns,
    getRowId: (row) => row.id,
    initialSort: { field: "requestedAt", direction: "desc" },
    rowActions,
  });
}

/** Approve, process or reject a refund request. */
export function useUpdateRefundStatus() {
  return useMutation<
    AdminFlightRefund,
    { id: string; status: AdminFlightRefund["status"] }
  >({
    mutationFn: ({ id, status }) => flightRefundService.update(id, { status }),
    invalidateKeys: [flightRefundKeys.all],
  });
}
