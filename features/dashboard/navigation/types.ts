import type { FeatureFlag, Permission } from "../rbac/types";

/**
 * Menu domain types.
 *
 * A {@link MenuNode} is the serialisable unit the sidebar renders. It supports
 * infinite nesting, and every access/gating field is data — so the entire
 * navigation tree can be delivered by the API (Phase 3) without code changes.
 * Icons are stored as *string names* (resolved by the icon registry) to keep
 * the config JSON-safe, matching the project's existing config convention.
 */

/** A dynamic badge shown next to a menu item. */
export interface MenuBadge {
  /** Literal text, or a key resolved against live counts (Phase 5). */
  label?: string;
  /** Named live counter (e.g. "notifications.unread"). */
  countKey?: string;
  variant?: "primary" | "accent" | "success" | "danger" | "neutral";
}

export interface MenuNode {
  /** Stable id — also used for pinned/favorite/recent persistence. */
  id: string;
  label: string;
  /** Registered icon name (see dashboard-icons). Optional for leaf children. */
  icon?: string;
  /** Route target. Omit for pure group headers that only expand children. */
  href?: string;
  /** Nested items — unlimited depth. */
  children?: MenuNode[];
  /** Static or live badge. */
  badge?: MenuBadge;

  // ---- Access / gating (all optional; absent = visible to everyone) ----
  /** Requires *all* of these permissions. */
  permissions?: Permission[];
  /** Requires *any* of these permissions. */
  anyPermission?: Permission[];
  /** Requires this feature flag to be enabled. */
  featureFlag?: FeatureFlag;

  /** Marks external links (open in new tab, no active matching). */
  external?: boolean;
  /** Visually separates this item as the start of a new group. */
  sectionStart?: boolean;
  /** Optional group heading rendered above the item when expanded. */
  sectionLabel?: string;
}

/** A menu node augmented with UI-computed state for rendering. */
export interface ResolvedMenuNode extends MenuNode {
  children?: ResolvedMenuNode[];
  /** Depth in the tree, 0 for top level. */
  depth: number;
  /** True when the current route matches this node or a descendant. */
  active: boolean;
}
