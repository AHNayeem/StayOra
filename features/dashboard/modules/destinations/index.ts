/**
 * Destinations module — the admin surface for the canonical destination store.
 *
 * The entity, its lifecycle rules and its persistence live in
 * `features/destinations`; this module is the dashboard's view of them (columns,
 * form, list, hooks). Nothing here holds destination data.
 */
export * from "./types";
export { destinationSchema, toDestinationFormValues, toDestinationInput } from "./schemas";
export type { DestinationFormValues } from "./schemas";
export {
  destinationKeys,
  destinationsService,
  getDestinationCountryOptions,
  getDestinationSummary,
} from "./service";
export { destinationColumns } from "./columns";
export {
  useCreateDestination,
  useDeleteDestination,
  useDestination,
  useDestinationList,
  useDestinationSummary,
  useSetDestinationStatus,
  useUpdateDestination,
} from "./hooks";
export { DestinationList } from "./list";
export { DestinationForm } from "./form";
export { DestinationEditor } from "./editor";
