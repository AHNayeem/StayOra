"use client";

import { type ReactNode } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownItem, DropdownSeparator } from "../ui/dropdown-menu";
import { Can } from "../rbac/permission-guard";
import type { Permission } from "../rbac/types";

interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Permissions required to show each action (checked via {@link Can}). */
  viewPermission?: Permission[];
  editPermission?: Permission[];
  deletePermission?: Permission[];
  /** Extra menu items rendered above the destructive group. */
  extra?: ReactNode;
  /** Accessible label for the trigger, e.g. "Actions for Grand Plaza". */
  label?: string;
}

/**
 * RowActions — the trailing "⋯" menu for a data-table row (view / edit /
 * delete + custom actions), each gated by a permission. Rendered inside an
 * actions column via {@link useResourceList}'s `rowActions`. It stops click
 * propagation so opening the menu never triggers the row's own click (e.g.
 * navigate-to-detail).
 */
export function RowActions({
  onView,
  onEdit,
  onDelete,
  viewPermission,
  editPermission,
  deletePermission,
  extra,
  label = "Row actions",
}: RowActionsProps) {
  const hasDestructive = Boolean(onDelete);
  const hasPrimary = Boolean(onView || onEdit || extra);

  return (
    <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu
        label={label}
        trigger={({ props }) => (
          <button
            type="button"
            {...props}
            className="inline-flex size-8 items-center justify-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">{label}</span>
          </button>
        )}
      >
        {onView && (
          <Can anyPermission={viewPermission}>
            <DropdownItem icon={<Eye />} onSelect={onView}>
              View
            </DropdownItem>
          </Can>
        )}
        {onEdit && (
          <Can anyPermission={editPermission}>
            <DropdownItem icon={<Pencil />} onSelect={onEdit}>
              Edit
            </DropdownItem>
          </Can>
        )}
        {extra}
        {hasPrimary && hasDestructive && <DropdownSeparator />}
        {onDelete && (
          <Can anyPermission={deletePermission}>
            <DropdownItem icon={<Trash2 />} danger onSelect={onDelete}>
              Delete
            </DropdownItem>
          </Can>
        )}
      </DropdownMenu>
    </div>
  );
}
