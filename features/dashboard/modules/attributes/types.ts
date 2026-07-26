import type { StatusDef } from "../../lib/status";

export const ATTRIBUTE_STATUS_VALUES = ["enabled", "disabled"] as const;
export type AttributeStatus = (typeof ATTRIBUTE_STATUS_VALUES)[number];

export const ATTRIBUTE_INPUT_TYPE_VALUES = [
  "select",
  "text",
  "boolean",
  "number",
] as const;
export type AttributeInputType = (typeof ATTRIBUTE_INPUT_TYPE_VALUES)[number];

export interface Attribute {
  id: string;
  name: string;
  group: string;
  inputType: AttributeInputType;
  valuesCount: number;
  status: AttributeStatus;
  updatedAt: string;
}

export const ATTRIBUTE_STATUSES: readonly StatusDef<AttributeStatus>[] = [
  { value: "enabled", label: "Enabled", tone: "success" },
  { value: "disabled", label: "Disabled", tone: "neutral" },
];
