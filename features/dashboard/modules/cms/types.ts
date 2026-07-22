import type { StatusDef } from "../../lib/status";

export const CMS_STATUS_VALUES = ["draft", "published", "scheduled"] as const;
export type CmsStatus = (typeof CMS_STATUS_VALUES)[number];

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  type: string;
  author: string;
  status: CmsStatus;
  updatedAt: string;
}

export const CMS_STATUSES: readonly StatusDef<CmsStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "published", label: "Published", tone: "success" },
  { value: "scheduled", label: "Scheduled", tone: "info" },
];
