/** Catalog module — hotels reference entity (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { hotelSchema } from "./schemas";
export type { HotelFormValues } from "./schemas";
export { hotelsService, hotelKeys } from "./service";
export { hotelColumns } from "./columns";
export {
  useHotels,
  useCreateHotel,
  useUpdateHotel,
  useDeleteHotel,
} from "./hooks";
export { HotelsList } from "./list";
export { HotelForm } from "./form";
