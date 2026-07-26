import { createStubService } from "../../crud";
import { MENU_ITEMS_SEED } from "./data";
import type { MenuItem } from "./types";
import type { MenuItemFormValues } from "./schemas";

/** Navigation menu items data source (in-memory stub; repository-ready). */
export const menusService = createStubService<MenuItem, MenuItemFormValues>({
  seed: MENU_ITEMS_SEED,
  getId: (row) => row.id,
  searchFields: ["label", "url"],
  idPrefix: "menu",
  applyCreate: (input, id) => ({
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  }),
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const menuKeys = {
  all: ["cms", "menus"] as const,
};
