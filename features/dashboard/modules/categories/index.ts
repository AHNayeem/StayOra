/** Categories module — listing categories and taxonomy (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { categorySchema } from "./schemas";
export type { CategoryFormValues } from "./schemas";
export { categoriesService, categoryKeys } from "./service";
export { categoryColumns } from "./columns";
export {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "./hooks";
export { CategoriesList } from "./list";
export { CategoryForm } from "./form";
