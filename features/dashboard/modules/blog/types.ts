/**
 * Dashboard-side blog types.
 *
 * The entity itself is *not* redefined here — it is the canonical `types/blog`
 * model the public site renders, imported so the dashboard and the storefront
 * cannot drift. Only presentation metadata (status tones) and the list KPIs live
 * in this module.
 */

import type { BlogCategoryStatus, BlogStatus } from "@/types/blog";
import { BLOG_CATEGORY_STATUS_VALUES, BLOG_STATUS_VALUES } from "@/types/blog";
import type { StatusDef } from "../../lib/status";

export type {
  BlogBlock,
  BlogCategory,
  BlogCategoryInput,
  BlogCategoryPatch,
  BlogPost,
  BlogPostInput,
  BlogPostPatch,
  BlogStatus,
} from "@/types/blog";
export { BLOG_CATEGORY_STATUS_VALUES, BLOG_STATUS_VALUES };

/** How each post status renders as a badge and reads in a filter. */
export const BLOG_STATUSES: readonly StatusDef<BlogStatus>[] = [
  { value: "published", label: "Published", tone: "success" },
  { value: "draft", label: "Draft", tone: "warning" },
  { value: "archived", label: "Archived", tone: "neutral" },
];

/** How each category status renders. */
export const BLOG_CATEGORY_STATUSES: readonly StatusDef<BlogCategoryStatus>[] = [
  { value: "active", label: "Active", tone: "success" },
  { value: "hidden", label: "Hidden", tone: "neutral" },
];

export interface BlogSummary {
  total: number;
  published: number;
  draft: number;
  archived: number;
  featured: number;
  /** Distinct categories with at least one published post. */
  categories: number;
}
