/** Apartments module — serviced apartment inventory (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { apartmentSchema } from "./schemas";
export type { ApartmentFormValues } from "./schemas";
export { apartmentsService, apartmentKeys } from "./service";
export { apartmentColumns } from "./columns";
export {
  useApartments,
  useCreateApartment,
  useUpdateApartment,
  useDeleteApartment,
} from "./hooks";
export { ApartmentsList } from "./list";
export { ApartmentForm } from "./form";
