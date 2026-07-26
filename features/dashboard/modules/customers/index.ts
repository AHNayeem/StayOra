/** Customers module — directory (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { customerSchema } from "./schemas";
export type { CustomerFormValues } from "./schemas";
export { customersService, customerKeys } from "./service";
export { customerColumns } from "./columns";
export {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "./hooks";
export { CustomersList } from "./list";
export { CustomerForm } from "./form";
