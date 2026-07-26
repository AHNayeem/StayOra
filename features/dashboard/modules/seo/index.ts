/** SEO module — per-route meta tags (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { seoSchema } from "./schemas";
export type { SeoFormValues } from "./schemas";
export { seoService, seoKeys } from "./service";
export { seoColumns } from "./columns";
export {
  useSeoEntries,
  useCreateSeoEntry,
  useUpdateSeoEntry,
  useDeleteSeoEntry,
} from "./hooks";
export { SeoForm } from "./form";
export { SeoList } from "./list";
