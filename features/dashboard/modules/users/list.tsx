"use client";

import { useState } from "react";
import { Download, UserPlus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { ROLE_LIST } from "../../rbac/roles";
import { useUsers, useDeleteUser } from "./hooks";
import { UserForm } from "./form";
import { USER_STATUSES, type User } from "./types";

const statusLabel = labelMap(USER_STATUSES);
const roleLabel = Object.fromEntries(ROLE_LIST.map((r) => [r.id, r.label]));

/** Users directory — invite, per-row edit and delete, filter and export. */
export function UsersList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const del = useDeleteUser();

  const list = useUsers((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onEdit={() => setEditing(row)}
      onDelete={() => setDeleting(row)}
      editPermission={["users:update"]}
      deletePermission={["users:delete"]}
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as User["status"]]}` }]
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

  const handleExport = () => {
    exportToCsv<User>("users", list.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Email", value: (r) => r.email },
      { header: "Role", value: (r) => roleLabel[r.roleId] ?? r.roleId },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Last active", value: (r) => formatDate(r.lastActiveAt) },
      { header: "Created", value: (r) => formatDate(r.createdAt) },
    ]);
  };

  return (
    <>
      <ResourceListView<User>
        list={list}
        searchPlaceholder="Search name or email…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(USER_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <div className="flex items-center gap-2">
            <Can anyPermission={["users:export"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" />}
                onClick={handleExport}
                disabled={list.rows.length === 0}
              >
                Export CSV
              </Button>
            </Can>
            <Can anyPermission={["users:create"]}>
              <Button size="sm" onClick={() => setCreating(true)}>
                <UserPlus className="size-4" aria-hidden="true" />
                Invite user
              </Button>
            </Can>
          </div>
        }
        caption="Users"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit user" : "Invite user"}
      >
        {(creating || editing) && (
          <UserForm
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
        title="Remove user?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> will
            lose access immediately. This can&apos;t be undone.
          </>
        }
        confirmLabel="Remove user"
      />
    </>
  );
}
