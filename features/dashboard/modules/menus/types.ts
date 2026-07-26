import type { StatusDef } from "../../lib/status";

export const MENU_LOCATION_VALUES = ["header", "footer", "legal"] as const;
export type MenuLocation = (typeof MENU_LOCATION_VALUES)[number];

export interface MenuItem {
  id: string;
  label: string;
  location: MenuLocation;
  /** Target path or absolute URL. */
  url: string;
  /** Position within its location (ascending). */
  order: number;
  visible: boolean;
  updatedAt: string;
}

export const MENU_LOCATIONS: readonly StatusDef<MenuLocation>[] = [
  { value: "header", label: "Header", tone: "info" },
  { value: "footer", label: "Footer", tone: "neutral" },
  { value: "legal", label: "Legal", tone: "warning" },
];
