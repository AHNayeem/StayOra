/**
 * Flights module — airline, airport, route, schedule, booking, passenger and
 * refund management (types, schemas, services, columns, hooks, UI).
 */
export * from "./types";
export {
  airlineSchema,
  airportSchema,
  routeSchema,
  scheduleSchema,
} from "./schemas";
export type {
  AirlineFormValues,
  AirportFormValues,
  RouteFormValues,
  ScheduleFormValues,
} from "./schemas";
export {
  airlineService,
  airlineKeys,
  airportService,
  airportKeys,
  routeService,
  routeKeys,
  scheduleService,
  scheduleKeys,
  flightBookingService,
  flightBookingKeys,
  passengerService,
  passengerKeys,
  flightRefundService,
  flightRefundKeys,
} from "./service";
export {
  airlineColumns,
  airportColumns,
  routeColumns,
  scheduleColumns,
  flightBookingColumns,
  passengerColumns,
  flightRefundColumns,
} from "./columns";
export {
  useAdminAirlines,
  useCreateAirline,
  useUpdateAirline,
  useDeleteAirline,
  useAdminAirports,
  useCreateAirport,
  useUpdateAirport,
  useDeleteAirport,
  useAdminRoutes,
  useCreateRoute,
  useUpdateRoute,
  useDeleteRoute,
  useAdminSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useAdminFlightBookings,
  useUpdateFlightBookingStatus,
  useAdminPassengers,
  useAdminFlightRefunds,
  useUpdateRefundStatus,
} from "./hooks";
export {
  AirlinesList,
  AirportsList,
  RoutesList,
  SchedulesList,
  FlightBookingsList,
  PassengersList,
  FlightRefundsList,
} from "./lists";
export { AirlineForm, AirportForm, RouteForm, ScheduleForm } from "./forms";
export { FlightsOverview } from "./overview";
