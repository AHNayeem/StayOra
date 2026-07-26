"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { toast } from "@/lib/toast";
import { useDeleteMenuItem, useMenuItems, useSetMenuVisibility } from "./hooks";
import { MenuItemForm } from "./form";
import { MENU_LOCATIONS, type MenuItem } from "./types";

const locationLabel = labelMap(MENU_LOCATIONS);

/** Navigation menus — location facet, create/edit drawer, show/hide toggle, delete. */
export function MenuList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const del = useDeleteMenuItem();
  const setVisibility = useSetMenuVisibility();

  const list = useMenuItems((row) => (
    <RowActions
      label={`Actions for ${row.label}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["cms:update"]}
      deletePermission={["cms:delete"]}
      extra={
        <Can anyPermission={["cms:update"]}>
          <DropdownItem
            icon={row.visible ? <EyeOff /> : <Eye />}
            onSelect={() =>
              void setVisibility
                .mutateAsync({ id: row.id, visible: !row.visible })
                .then(() =>
                  toast.success(row.visible ? "Item hidden" : "Item now visible"),
                )
            }
          >
            {row.visible ? "Hide" : "Show"}
          </DropdownItem>
        </Can>
      }
    />
  ));

  const location = list.filters.location ?? "";
  const activeFilters: ActiveFilter[] = location
    ? [{ key: "location", label: `Location: ${locationLabel[location as MenuItem["location"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <ResourceListView<MenuItem>
        list={list}
        searchPlaceholder="Search label or URL…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by location"
            value={location}
            onChange={(e) => list.setFilter("location", e.target.value)}
            options={[
              { value: "", label: "All locations" },
              ...statusOptions(MENU_LOCATIONS),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["cms:create"]}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add menu item
            </Button>
          </Can>
        }
        caption="Navigation menu items"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit menu item" : "New menu item"}
      >
        {(creating || editing) && (
          <MenuItemForm
            initial={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete menu item?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.label}</strong> will be
            removed from the {deleting ? locationLabel[deleting.location].toLowerCase() : ""}{" "}
            menu. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete menu item"
      />
    </>
  );
}
