import type { StatusDef } from "../../lib/status";

/**
 * Editorial workflow states.
 *
 *   draft ──▶ review ──▶ published
 *               │            ▲
 *               └── scheduled┘   (publishes itself when `publishAt` passes)
 *
 * `scheduled` is a *committed* state, not a parallel one: a page only reaches
 * it from review, which is what stops an unreviewed draft going live at 3am.
 */
export const CMS_STATUS_VALUES = [
  "draft",
  "review",
  "scheduled",
  "published",
] as const;
export type CmsStatus = (typeof CMS_STATUS_VALUES)[number];

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  type: string;
  author: string;
  status: CmsStatus;
  /** One-line summary, shown in previews and listings. */
  excerpt: string;
  /** Page body — plain text with blank-line paragraphs. */
  body: string;
  /** Monotonic, incremented on every saved edit and every restore. */
  version: number;
  /** When a scheduled page goes live (ISO). Only set while `scheduled`. */
  publishAt?: string;
  /** When it actually went live (ISO). */
  publishedAt?: string;
  /** Who moved it into review, and who approved it. */
  submittedBy?: string;
  reviewedBy?: string;
  updatedAt: string;
}

/**
 * An immutable snapshot of a page, taken before every content change and on
 * every workflow transition. Restoring one writes its content back onto the
 * page as a *new* version — history is never rewritten.
 */
export interface CmsVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  slug: string;
  type: string;
  author: string;
  excerpt: string;
  body: string;
  status: CmsStatus;
  savedAt: string;
  savedBy: string;
  /** Why this version exists — "Edited", "Submitted for review", "Restored v3"… */
  note: string;
}

export const CMS_STATUSES: readonly StatusDef<CmsStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "review", label: "In review", tone: "warning" },
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "published", label: "Published", tone: "success" },
];
