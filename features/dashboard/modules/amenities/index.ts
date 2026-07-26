/** Amenities module — property/room amenities (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { amenitySchema } from "./schemas";
export type { AmenityFormValues } from "./schemas";
export { amenitiesService, amenityKeys } from "./service";
export { amenityColumns } from "./columns";
export {
  useAmenities,
  useCreateAmenity,
  useUpdateAmenity,
  useDeleteAmenity,
} from "./hooks";
export { AmenitiesList } from "./list";
export { AmenityForm } from "./form";
