/** Convention hall module — event/convention venue inventory (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { conventionHallSchema } from "./schemas";
export type { ConventionHallFormValues } from "./schemas";
export { conventionHallsService, conventionHallKeys } from "./service";
export { conventionHallColumns } from "./columns";
export {
  useConventionHalls,
  useCreateConventionHall,
  useUpdateConventionHall,
  useDeleteConventionHall,
} from "./hooks";
export { ConventionHallList } from "./list";
export { ConventionHallForm } from "./form";
