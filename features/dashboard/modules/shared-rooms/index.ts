/** Shared rooms module — hostel/dormitory bed inventory (types, schema, service, columns, hooks, UI). */
export * from "./types";
export { sharedRoomSchema } from "./schemas";
export type { SharedRoomFormValues } from "./schemas";
export { sharedRoomsService, sharedRoomKeys } from "./service";
export { sharedRoomColumns } from "./columns";
export {
  useSharedRooms,
  useCreateSharedRoom,
  useUpdateSharedRoom,
  useDeleteSharedRoom,
} from "./hooks";
export { SharedRoomsList } from "./list";
export { SharedRoomForm } from "./form";
