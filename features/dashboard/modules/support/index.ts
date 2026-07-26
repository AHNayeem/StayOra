/** Support module — ticket queue (types, service, columns, hooks, UI). */
export * from "./types";
export { ticketsService, ticketKeys } from "./service";
export { ticketColumns } from "./columns";
export { useTickets, useUpdateTicket } from "./hooks";
export { SupportList } from "./list";
