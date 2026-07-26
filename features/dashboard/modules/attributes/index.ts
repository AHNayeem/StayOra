/** Attributes module — configurable listing attributes (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { attributeSchema } from "./schemas";
export type { AttributeFormValues } from "./schemas";
export { attributesService, attributeKeys } from "./service";
export { attributeColumns } from "./columns";
export {
  useAttributes,
  useCreateAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
} from "./hooks";
export { AttributesList } from "./list";
export { AttributeForm } from "./form";
