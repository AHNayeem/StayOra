"use client";

import { useState } from "react";
import { Plus, Power, PowerOff } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { toast } from "@/lib/toast";
import {
  useDeleteTemplate,
  useSetTemplateEnabled,
  useTemplates,
} from "./hooks";
import { TemplateForm } from "./form";
import { TEMPLATE_CHANNELS, type NotificationTemplate } from "./types";

const channelLabel = labelMap(TEMPLATE_CHANNELS);

/** Notification Templates — channel facet, create/edit editor, activate toggle, delete. */
export function TemplateList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [deleting, setDeleting] = useState<NotificationTemplate | null>(null);
  const del = useDeleteTemplate();
  const setEnabled = useSetTemplateEnabled();

  const list = useTemplates((row) => {
    const enabled = row.enabled;
    return (
      <RowActions
        label={`Actions for ${row.name}`}
        onEdit={() => setEditing(row)}
        onDelete={() => setDeleting(row)}
        editPermission={["system:update"]}
        deletePermission={["system:delete"]}
        extra={
          <Can anyPermission={["system:update"]}>
            <DropdownItem
              icon={enabled ? <PowerOff /> : <Power />}
              onSelect={() =>
                void setEnabled
                  .mutateAsync({ id: row.id, enabled: !enabled })
                  .then(() => toast.success(enabled ? "Template turned off" : "Template activated"))
              }
            >
              {enabled ? "Turn off" : "Activate"}
            </DropdownItem>
          </Can>
        }
      />
    );
  });

  const channel = list.filters.channel ?? "";
  const activeFilters: ActiveFilter[] = channel
    ? [{ key: "channel", label: `Channel: ${channelLabel[channel as NotificationTemplate["channel"]]}` }]
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
      <ResourceListView<NotificationTemplate>
        list={list}
        searchPlaceholder="Search name, key or subject…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by channel"
            value={channel}
            onChange={(e) => list.setFilter("channel", e.target.value)}
            options={[{ value: "", label: "All channels" }, ...statusOptions(TEMPLATE_CHANNELS)]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["system:create"]}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add template
            </Button>
          </Can>
        }
        caption="Notification templates"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit template" : "New template"}
      >
        {(creating || editing) && (
          <TemplateForm initial={editing ?? undefined} onDone={closeForm} onCancel={closeForm} />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete template?"
        message={
          <>
            The <strong className="font-semibold text-ink">{deleting?.name}</strong> template
            will be permanently removed and its event will stop sending. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete template"
      />
    </>
  );
}
